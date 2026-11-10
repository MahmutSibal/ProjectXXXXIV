using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.PaymentSetup.Commands;

/// <param name="Iban">Boşluklu ya da boşluksuz girilebilir; TR + 24 rakam, mod-97 doğrulanır.</param>
/// <param name="AccountHolderBusinessName">Hesap sahibi işletme/şirket unvanı.</param>
/// <param name="AccountHolderFullName">Hesap sahibi yetkilinin adı soyadı.</param>
public sealed record UpdateRestaurantPaymentSettingsCommand(
    string RestaurantId,
    bool OnlinePaymentEnabled,
    string? Iban,
    string? AccountHolderBusinessName,
    string? AccountHolderFullName) : IRequest<Unit>;

public sealed class UpdateRestaurantPaymentSettingsCommandHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService)
    : IRequestHandler<UpdateRestaurantPaymentSettingsCommand, Unit>
{
    public async Task<Unit> Handle(UpdateRestaurantPaymentSettingsCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        _ = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("İşletme bulunamadı.");

        var iban = TurkishIban.Normalize(request.Iban);
        var businessName = (request.AccountHolderBusinessName ?? string.Empty).Trim();
        var fullName = (request.AccountHolderFullName ?? string.Empty).Trim();

        if (iban.Length > 0 && !TurkishIban.IsValid(iban))
        {
            throw new InvalidOperationException("Geçerli bir IBAN girin (TR ile başlayan 26 karakter).");
        }

        if (iban.Length > 0 && (businessName.Length == 0 || fullName.Length == 0))
        {
            throw new InvalidOperationException("IBAN girildiğinde işletme adı ve hesap sahibinin adı soyadı zorunludur.");
        }

        if (businessName.Length > 200 || fullName.Length > 150)
        {
            throw new InvalidOperationException("İşletme adı en fazla 200, ad soyad en fazla 150 karakter olabilir.");
        }

        // Ödemelerin aktarılacağı hesap olmadan kart ödemesi açılamaz.
        if (request.OnlinePaymentEnabled && iban.Length == 0)
        {
            throw new InvalidOperationException("Online ödemeyi açmak için önce IBAN bilgilerinizi girin.");
        }

        var repository = unitOfWork.Repository<RestaurantPaymentSettings>();
        var existing = await repository.GetByIdAsync(request.RestaurantId, cancellationToken);

        var settings = existing ?? new RestaurantPaymentSettings(request.RestaurantId);
        settings.OnlinePaymentEnabled = request.OnlinePaymentEnabled;
        settings.Iban = iban;
        settings.AccountHolderBusinessName = businessName;
        settings.AccountHolderFullName = fullName;
        settings.UpdatedAt = DateTime.UtcNow;

        if (existing is null)
        {
            await repository.InsertAsync(settings, cancellationToken);
        }
        else
        {
            await repository.ReplaceAsync(settings, cancellationToken);
        }

        // Denetim kaydına IBAN yalnızca maskeli yazılır.
        await auditLogService.RecordAsync(
            "RestaurantPaymentSettingsUpdated", nameof(RestaurantPaymentSettings), settings.Id,
            $"Ödeme ayarları güncellendi. Online ödeme: {(settings.OnlinePaymentEnabled ? "açık" : "kapalı")}, " +
            $"IBAN: {(iban.Length > 0 ? TurkishIban.Mask(iban) : "-")}",
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}
