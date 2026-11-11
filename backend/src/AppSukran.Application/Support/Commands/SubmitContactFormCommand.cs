using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.Support.Commands;

/// <summary>
/// Sitedeki "İletişim" formu (giriş gerektirmez). Talep Süper Admin'in Destek ekranına
/// düşer ve e-posta açıksa platform adresine bildirim gider.
/// </summary>
public sealed record SubmitContactFormCommand(
    string FullName,
    string BusinessName,
    string Email,
    string Phone,
    string City,
    string? BusinessType,
    string? Subject,
    int? TableCount,
    string Message,
    bool KvkkAccepted,
    string? Website) : IRequest<Unit>;

public sealed class SubmitContactFormCommandValidator : AbstractValidator<SubmitContactFormCommand>
{
    public SubmitContactFormCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Ad soyad girin.").MaximumLength(100);
        RuleFor(x => x.BusinessName).NotEmpty().WithMessage("İşletme adını girin.").MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.").MaximumLength(150);
        RuleFor(x => x.Phone).NotEmpty().WithMessage("Telefon numarası girin.").MaximumLength(30);
        RuleFor(x => x.City).NotEmpty().WithMessage("Şehir girin.").MaximumLength(60);
        RuleFor(x => x.BusinessType).MaximumLength(40);
        RuleFor(x => x.Subject).MaximumLength(40);
        RuleFor(x => x.TableCount).InclusiveBetween(0, 10000).When(x => x.TableCount.HasValue);
        RuleFor(x => x.Message).NotEmpty().WithMessage("Mesajınızı yazın.").MaximumLength(1500);
        RuleFor(x => x.KvkkAccepted).Equal(true).WithMessage("KVKK Aydınlatma Metni'ni onaylamanız gerekiyor.");
    }
}

public sealed class SubmitContactFormCommandHandler(
    IUnitOfWork unitOfWork,
    IEmailService emailService) : IRequestHandler<SubmitContactFormCommand, Unit>
{
    private static readonly Dictionary<string, string> Subjects = new()
    {
        ["demo"] = "Demo talebi", ["pricing"] = "Fiyat bilgisi", ["qr-menu"] = "QR menü",
        ["payment"] = "Ödeme sistemi", ["panels"] = "Paneller", ["enterprise"] = "Kurumsal",
        ["support"] = "Destek",
    };

    private static readonly Dictionary<string, string> BusinessTypes = new()
    {
        ["restaurant"] = "Restoran", ["cafe"] = "Kafe", ["fine-dining"] = "Fine dining",
        ["hotel"] = "Otel", ["chain"] = "Zincir", ["other"] = "Diğer",
    };

    public async Task<Unit> Handle(SubmitContactFormCommand request, CancellationToken cancellationToken)
    {
        // Bot tuzağı: insanlar görmediği bu alanı doldurmaz. Doluysa sessizce "alındı" deriz
        // (bot hata alıp yeniden denemesin) ama hiçbir şey kaydetmeyiz.
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            return Unit.Value;
        }

        var subject = request.Subject is not null && Subjects.TryGetValue(request.Subject, out var s) ? s : "Genel";
        var businessType = request.BusinessType is not null && BusinessTypes.TryGetValue(request.BusinessType, out var t) ? t : "-";

        var content =
            $"{request.Message.Trim()}\n\n" +
            $"Ad soyad: {request.FullName.Trim()}\n" +
            $"E-posta: {request.Email.Trim()}\n" +
            $"Şehir: {request.City.Trim()}\n" +
            $"İşletme türü: {businessType}\n" +
            $"Masa sayısı: {(request.TableCount?.ToString() ?? "-")}";

        await unitOfWork.Repository<SupportRequest>().InsertAsync(new SupportRequest
        {
            BusinessName = request.BusinessName.Trim(),
            Topic = Truncate($"İletişim formu: {subject}", 100),
            Content = Truncate(content, 2000),
            Phone = request.Phone.Trim(),
            IsCalled = false,
        }, cancellationToken);

        // Bildirim e-postası kaydı engellemez: e-posta gitmese de talep Destek ekranında.
        if (emailService.NotificationAddress is { } to)
        {
            try
            {
                await emailService.SendAsync(to,
                    $"Yeni iletişim talebi: {request.BusinessName.Trim()} ({subject})",
                    $"Siteden yeni bir iletişim talebi geldi.\n\n" +
                    $"İşletme: {request.BusinessName.Trim()}\nTelefon: {request.Phone.Trim()}\n{content}\n\n" +
                    $"Talebi Süper Admin → Destek Talepleri ekranından görebilirsiniz.",
                    cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                // E-posta servisinin kendisi hatayı loglar (SmtpEmailService); talep zaten kaydedildi.
                _ = exception;
            }
        }

        return Unit.Value;
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
