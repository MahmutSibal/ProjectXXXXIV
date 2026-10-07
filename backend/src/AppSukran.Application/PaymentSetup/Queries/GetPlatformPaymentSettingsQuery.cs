using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.PaymentSetup.Queries;

/// <param name="Iban">Gösterim için 4'lü gruplara ayrılmış hâliyle döner.</param>
public sealed record PlatformPaymentSettingsResponse(
    string BankName,
    string AccountHolder,
    string Iban,
    string Branch,
    string PaymentNote,
    bool IsConfigured,
    bool BankTransferEnabled);

/// <summary>
/// Herkese açık: havale bilgileri fiyat/abonelik sayfalarında gösterilir.
/// Havale/EFT kapalıyken (veya IBAN yokken) tüm banka alanları boş döner.
/// </summary>
public sealed record GetPlatformPaymentSettingsQuery : IRequest<PlatformPaymentSettingsResponse>;

public sealed class GetPlatformPaymentSettingsQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetPlatformPaymentSettingsQuery, PlatformPaymentSettingsResponse>
{
    public async Task<PlatformPaymentSettingsResponse> Handle(
        GetPlatformPaymentSettingsQuery request, CancellationToken cancellationToken)
    {
        var settings = await unitOfWork.Repository<PlatformPaymentSettings>()
            .GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);

        if (settings is null || !settings.BankTransferEnabled || string.IsNullOrWhiteSpace(settings.Iban))
        {
            return new PlatformPaymentSettingsResponse(
                string.Empty, string.Empty, string.Empty, string.Empty, string.Empty, false, false);
        }

        return new PlatformPaymentSettingsResponse(
            settings.BankName,
            settings.AccountHolder,
            TurkishIban.Format(settings.Iban),
            settings.Branch,
            settings.PaymentNote,
            true,
            true);
    }
}

/// <summary>
/// Yalnızca SuperAdmin: kayıtlı değerleri anahtardan bağımsız döner (yönetim ekranı için).
/// <c>IsConfigured</c> = IBAN dolu; <c>BankTransferEnabled</c> = kayıtlı bayrak (kayıt yoksa false).
/// </summary>
public sealed record GetPlatformPaymentSettingsAdminQuery : IRequest<PlatformPaymentSettingsResponse>;

public sealed class GetPlatformPaymentSettingsAdminQueryHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetPlatformPaymentSettingsAdminQuery, PlatformPaymentSettingsResponse>
{
    public async Task<PlatformPaymentSettingsResponse> Handle(
        GetPlatformPaymentSettingsAdminQuery request, CancellationToken cancellationToken)
    {
        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            throw new UnauthorizedAccessException("Bu işlem yalnızca platform yöneticisine açıktır.");
        }

        var settings = await unitOfWork.Repository<PlatformPaymentSettings>()
            .GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);

        if (settings is null)
        {
            return new PlatformPaymentSettingsResponse(
                string.Empty, string.Empty, string.Empty, string.Empty, string.Empty, false, false);
        }

        return new PlatformPaymentSettingsResponse(
            settings.BankName,
            settings.AccountHolder,
            TurkishIban.Format(settings.Iban),
            settings.Branch,
            settings.PaymentNote,
            !string.IsNullOrWhiteSpace(settings.Iban),
            settings.BankTransferEnabled);
    }
}
