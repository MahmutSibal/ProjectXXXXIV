using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.Campaigns;

// --- Soyutlamalar ---------------------------------------------------------------------

/// <summary>Gönderilecek kampanyaları arka plan işçisine iletir.</summary>
public interface ICampaignQueue
{
    ValueTask EnqueueAsync(string campaignId, CancellationToken cancellationToken = default);
}

/// <summary>Kampanya e-postasındaki "abonelikten çık" bağlantısının imzası.</summary>
public interface IUnsubscribeTokenService
{
    string Create(string userId);

    bool IsValid(string userId, string token);
}

/// <summary>E-postaya eklenen gönderici bilgisi ve abonelikten çıkış satırları.</summary>
public static class CampaignMessage
{
    public const int MaxRecipients = 5000;

    public const string SenderName = "Şükran Akyıldız";
    public const string SenderService = "Sukran App";
    public const string SenderAddress = "Eyüp Nebi Mahallesi, 3563. Sokak No: 33/1 Eyyübiye / Şanlıurfa";

    public static string UnsubscribeUrl(string appBaseUrl, string userId, string token)
        => $"{appBaseUrl.TrimEnd('/')}/kampanya-iptal?u={Uri.EscapeDataString(userId)}&t={Uri.EscapeDataString(token)}";

    public static string Compose(string body, string unsubscribeUrl)
        => body.TrimEnd()
           + "\n\n--\n"
           + $"{SenderService} · {SenderName}\n{SenderAddress}\n\n"
           + "Bu iletiyi kampanya bildirimi tercihiniz nedeniyle aldınız. "
           + $"Almak istemiyorsanız tek tıkla çıkabilirsiniz: {unsubscribeUrl}\n";

    /// <summary>
    /// Görselli e-posta: sabit, güvenli bir şablon. Yönetici HAM HTML GİRMEZ; tüm metinler
    /// kaçışlanır, görsel ve bağlantı yalnızca https olabilir.
    /// </summary>
    public static string ComposeHtml(string subject, string body, string? imageUrl, string? buttonText, string? buttonUrl, string unsubscribeUrl)
    {
        static string E(string value) => System.Net.WebUtility.HtmlEncode(value);

        var paragraphs = string.Join(
            "",
            body.Replace("\r\n", "\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries)
                .Select(block => $"<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;color:#2b2b2b;\">{E(block.Trim()).Replace("\n", "<br>")}</p>"));

        var image = string.IsNullOrWhiteSpace(imageUrl)
            ? string.Empty
            : $"<tr><td><img src=\"{E(imageUrl)}\" alt=\"{E(subject)}\" width=\"600\" style=\"display:block;width:100%;max-width:600px;height:auto;border:0;\"></td></tr>";

        var button = string.IsNullOrWhiteSpace(buttonUrl) || string.IsNullOrWhiteSpace(buttonText)
            ? string.Empty
            : $"<p style=\"margin:24px 0 8px;\"><a href=\"{E(buttonUrl)}\" style=\"display:inline-block;background:#002819;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;\">{E(buttonText)}</a></p>";

        return $"""
            <!doctype html>
            <html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(subject)}</title></head>
            <body style="margin:0;padding:0;background:#f4f5f4;font-family:Arial,Helvetica,sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f4;"><tr><td align="center" style="padding:24px 12px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr><td style="background:#002819;padding:18px 24px;color:#fed65b;font-size:20px;font-weight:bold;">Şükran App</td></tr>
            {image}
            <tr><td style="padding:28px 24px 8px;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#002819;">{E(subject)}</h1>
            {paragraphs}
            {button}
            </td></tr>
            <tr><td style="padding:16px 24px 24px;border-top:1px solid #e6e8e6;font-size:12px;line-height:1.6;color:#6b6f6c;">
            {E(SenderService)} · {E(SenderName)}<br>{E(SenderAddress)}<br><br>
            Bu iletiyi kampanya bildirimi tercihiniz nedeniyle aldınız.
            <a href="{E(unsubscribeUrl)}" style="color:#002819;">Almak istemiyorsanız buradan çıkabilirsiniz.</a>
            </td></tr>
            </table></td></tr></table></body></html>
            """;
    }

    /// <summary>Görsel/buton adresi geçerli bir https adresi mi?</summary>
    public static bool IsHttpsUrl(string? value)
        => Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps;
}

// --- Yanıtlar -------------------------------------------------------------------------

public sealed record CampaignResponse(
    string Id,
    string Subject,
    string Body,
    string Status,
    int RecipientCount,
    int SentCount,
    int FailedCount,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    bool IsRich = false);

public sealed record CampaignAudienceResponse(int RecipientCount, int MaxRecipients, bool EmailEnabled, bool RichEnabled = false);

internal static class CampaignGuard
{
    public static void EnsureSuperAdmin(ICurrentUserService currentUserService)
    {
        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            throw new UnauthorizedAccessException("Kampanyaları yalnızca platform yöneticisi yönetebilir.");
        }
    }

    public static CampaignResponse ToResponse(Campaign campaign)
    {
        // Sunucu gönderim sırasında yeniden başlarsa kayıt "gönderiliyor" kalır; 2 saat sonra yarım kaldı say.
        var status = campaign.Status == Campaign.StatusSending && campaign.CreatedAt < DateTime.UtcNow.AddHours(-2)
            ? "Interrupted"
            : campaign.Status;

        return new CampaignResponse(
            campaign.Id, campaign.Subject, campaign.Body, status,
            campaign.RecipientCount, campaign.SentCount, campaign.FailedCount,
            campaign.CreatedAt, campaign.CompletedAt, campaign.IsRich);
    }

    public static Task<int> CountAudienceAsync(IUnitOfWork unitOfWork, CancellationToken cancellationToken)
        => unitOfWork.Repository<User>().CountAsync(
            user => user.MarketingConsent && user.IsActive && user.Email != string.Empty,
            cancellationToken);
}

internal static class CampaignRich
{
    public static bool IsRich(string? imageUrl, string? buttonUrl)
        => !string.IsNullOrWhiteSpace(imageUrl) || !string.IsNullOrWhiteSpace(buttonUrl);

    /// <summary>Özellik kapalıyken görsel/buton içeren gönderimi reddeder.</summary>
    public static void EnsureAllowed(IEmailService emailService, string? imageUrl, string? buttonUrl)
    {
        if (IsRich(imageUrl, buttonUrl) && !emailService.RichCampaignsEnabled)
        {
            throw new InvalidOperationException("Görselli e-posta özelliği kapalı.");
        }
    }
}

// --- Okuma ----------------------------------------------------------------------------

public sealed record GetCampaignAudienceQuery : IRequest<CampaignAudienceResponse>;

public sealed class GetCampaignAudienceQueryHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IEmailService emailService) : IRequestHandler<GetCampaignAudienceQuery, CampaignAudienceResponse>
{
    public async Task<CampaignAudienceResponse> Handle(GetCampaignAudienceQuery request, CancellationToken cancellationToken)
    {
        CampaignGuard.EnsureSuperAdmin(currentUserService);
        var count = await CampaignGuard.CountAudienceAsync(unitOfWork, cancellationToken);
        return new CampaignAudienceResponse(count, CampaignMessage.MaxRecipients, emailService.IsEnabled, emailService.RichCampaignsEnabled);
    }
}

public sealed record GetCampaignsQuery : IRequest<IReadOnlyCollection<CampaignResponse>>;

public sealed class GetCampaignsQueryHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService) : IRequestHandler<GetCampaignsQuery, IReadOnlyCollection<CampaignResponse>>
{
    public async Task<IReadOnlyCollection<CampaignResponse>> Handle(GetCampaignsQuery request, CancellationToken cancellationToken)
    {
        CampaignGuard.EnsureSuperAdmin(currentUserService);
        var campaigns = await unitOfWork.Repository<Campaign>()
            .QueryAsync(null, campaign => campaign.CreatedAt, descending: true, skip: 0, take: 50, cancellationToken);
        return campaigns.Select(CampaignGuard.ToResponse).ToList();
    }
}

// --- Gönderim -------------------------------------------------------------------------

public sealed record SendCampaignCommand(
    string Subject,
    string Body,
    string? ImageUrl = null,
    string? ButtonText = null,
    string? ButtonUrl = null) : IRequest<CampaignResponse>;

public sealed class SendCampaignCommandValidator : AbstractValidator<SendCampaignCommand>
{
    public SendCampaignCommandValidator()
    {
        RuleFor(x => x.Subject).NotEmpty().WithMessage("Konu girin.").MaximumLength(150).WithMessage("Konu en fazla 150 karakter olabilir.");
        RuleFor(x => x.Body).NotEmpty().WithMessage("Mesaj metnini girin.").MaximumLength(5000).WithMessage("Mesaj en fazla 5.000 karakter olabilir.");
        RuleFor(x => x.ImageUrl).Must(url => string.IsNullOrWhiteSpace(url) || (url.Length <= 500 && CampaignMessage.IsHttpsUrl(url)))
            .WithMessage("Görsel adresi https ile başlayan geçerli bir bağlantı olmalı.");
        RuleFor(x => x.ButtonUrl).Must(url => string.IsNullOrWhiteSpace(url) || (url.Length <= 500 && CampaignMessage.IsHttpsUrl(url)))
            .WithMessage("Buton bağlantısı https ile başlayan geçerli bir adres olmalı.");
        RuleFor(x => x.ButtonText).MaximumLength(40).WithMessage("Buton metni en fazla 40 karakter olabilir.");
        RuleFor(x => x).Must(x => string.IsNullOrWhiteSpace(x.ButtonUrl) == string.IsNullOrWhiteSpace(x.ButtonText))
            .WithMessage("Buton için hem metin hem bağlantı girin (ya da ikisini de boş bırakın).");
    }
}

public sealed class SendCampaignCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IEmailService emailService,
    ICampaignQueue queue,
    IAuditLogService auditLogService) : IRequestHandler<SendCampaignCommand, CampaignResponse>
{
    public async Task<CampaignResponse> Handle(SendCampaignCommand request, CancellationToken cancellationToken)
    {
        CampaignGuard.EnsureSuperAdmin(currentUserService);

        if (!emailService.IsEnabled)
        {
            throw new InvalidOperationException("E-posta gönderimi kapalı; önce e-posta ayarlarını tamamlayın.");
        }

        CampaignRich.EnsureAllowed(emailService, request.ImageUrl, request.ButtonUrl);

        var repository = unitOfWork.Repository<Campaign>();
        var threshold = DateTime.UtcNow.AddHours(-2);
        if (await repository.AnyAsync(c => c.Status == Campaign.StatusSending && c.CreatedAt > threshold, cancellationToken))
        {
            throw new InvalidOperationException("Devam eden bir gönderim var. Bitmesini bekleyin.");
        }

        var audience = await CampaignGuard.CountAudienceAsync(unitOfWork, cancellationToken);
        if (audience == 0)
        {
            throw new InvalidOperationException("Kampanya iznini vermiş alıcı yok.");
        }

        if (audience > CampaignMessage.MaxRecipients)
        {
            throw new InvalidOperationException($"Tek seferde en fazla {CampaignMessage.MaxRecipients} alıcıya gönderilebilir.");
        }

        var campaign = new Campaign
        {
            Subject = request.Subject.Trim(),
            Body = request.Body.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
            ButtonText = string.IsNullOrWhiteSpace(request.ButtonText) ? null : request.ButtonText.Trim(),
            ButtonUrl = string.IsNullOrWhiteSpace(request.ButtonUrl) ? null : request.ButtonUrl.Trim(),
            IsRich = CampaignRich.IsRich(request.ImageUrl, request.ButtonUrl),
            Status = Campaign.StatusSending,
            RecipientCount = audience,
            CreatedByUserId = currentUserService.UserId,
        };
        await repository.InsertAsync(campaign, cancellationToken);

        await auditLogService.RecordAsync(
            "CampaignSent", nameof(Campaign), campaign.Id,
            $"Kampanya gönderimi başlatıldı: \"{campaign.Subject}\", {audience} alıcı.",
            currentUserService.UserId, cancellationToken);

        await queue.EnqueueAsync(campaign.Id, cancellationToken);
        return CampaignGuard.ToResponse(campaign);
    }
}

/// <summary>Kampanyayı yalnızca isteği yapan yöneticinin kendi adresine gönderir (kayıt oluşturmaz).</summary>
public sealed record SendCampaignTestCommand(
    string Subject,
    string Body,
    string? ImageUrl = null,
    string? ButtonText = null,
    string? ButtonUrl = null) : IRequest<string>;

public sealed class SendCampaignTestCommandValidator : AbstractValidator<SendCampaignTestCommand>
{
    public SendCampaignTestCommandValidator()
    {
        RuleFor(x => x.Subject).NotEmpty().WithMessage("Konu girin.").MaximumLength(150);
        RuleFor(x => x.Body).NotEmpty().WithMessage("Mesaj metnini girin.").MaximumLength(5000);
        RuleFor(x => x.ImageUrl).Must(url => string.IsNullOrWhiteSpace(url) || (url.Length <= 500 && CampaignMessage.IsHttpsUrl(url)))
            .WithMessage("Görsel adresi https ile başlayan geçerli bir bağlantı olmalı.");
        RuleFor(x => x.ButtonUrl).Must(url => string.IsNullOrWhiteSpace(url) || (url.Length <= 500 && CampaignMessage.IsHttpsUrl(url)))
            .WithMessage("Buton bağlantısı https ile başlayan geçerli bir adres olmalı.");
        RuleFor(x => x.ButtonText).MaximumLength(40).WithMessage("Buton metni en fazla 40 karakter olabilir.");
        RuleFor(x => x).Must(x => string.IsNullOrWhiteSpace(x.ButtonUrl) == string.IsNullOrWhiteSpace(x.ButtonText))
            .WithMessage("Buton için hem metin hem bağlantı girin (ya da ikisini de boş bırakın).");
    }
}

public sealed class SendCampaignTestCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IEmailService emailService,
    IUnsubscribeTokenService tokenService) : IRequestHandler<SendCampaignTestCommand, string>
{
    public async Task<string> Handle(SendCampaignTestCommand request, CancellationToken cancellationToken)
    {
        CampaignGuard.EnsureSuperAdmin(currentUserService);
        CampaignRich.EnsureAllowed(emailService, request.ImageUrl, request.ButtonUrl);

        var userId = currentUserService.UserId ?? throw new UnauthorizedAccessException("Oturum bulunamadı.");
        var user = await unitOfWork.Repository<User>().GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("Kullanıcı bulunamadı.");

        var url = CampaignMessage.UnsubscribeUrl(emailService.AppBaseUrl, user.Id, tokenService.Create(user.Id));
        var subject = "[TEST] " + request.Subject.Trim();
        var html = CampaignRich.IsRich(request.ImageUrl, request.ButtonUrl)
            ? CampaignMessage.ComposeHtml(subject, request.Body, request.ImageUrl?.Trim(), request.ButtonText?.Trim(), request.ButtonUrl?.Trim(), url)
            : null;
        await emailService.SendMarketingAsync(
            user.Email, subject, CampaignMessage.Compose(request.Body, url), url, html, cancellationToken);

        return user.Email;
    }
}

// --- Abonelikten çıkış (herkese açık, imzalı bağlantı) -----------------------------------

public sealed record UnsubscribeCampaignCommand(string UserId, string Token) : IRequest;

public sealed class UnsubscribeCampaignCommandHandler(
    IUnitOfWork unitOfWork,
    IUnsubscribeTokenService tokenService) : IRequestHandler<UnsubscribeCampaignCommand>
{
    public async Task Handle(UnsubscribeCampaignCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.Token)
            || !tokenService.IsValid(request.UserId, request.Token))
        {
            throw new InvalidOperationException("Bağlantı geçersiz ya da süresi dolmuş.");
        }

        var repository = unitOfWork.Repository<User>();
        var user = await repository.GetByIdAsync(request.UserId, cancellationToken);
        if (user is null || !user.MarketingConsent)
        {
            return; // Zaten kapalı: işlem tekrarlanabilir (idempotent).
        }

        user.MarketingConsent = false;
        user.MarketingConsentAt = null;
        await repository.ReplaceAsync(user, cancellationToken);
    }
}
