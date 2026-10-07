using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.PaymentSetup.Commands;

/// <param name="ApiKey">Boş/null ise kayıtlı değer korunur.</param>
/// <param name="SecretKey">Boş/null ise kayıtlı değer korunur.</param>
/// <param name="BaseUrl">Boş/null ise kayıtlı (yoksa varsayılan) adres korunur.</param>
public sealed record UpdateRestaurantPaymentSettingsCommand(
    string RestaurantId,
    bool OnlinePaymentEnabled,
    string? ApiKey,
    string? SecretKey,
    string? BaseUrl) : IRequest<Unit>;

public sealed class UpdateRestaurantPaymentSettingsCommandHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard,
    ISecretProtectionService secretProtection,
    IPaymentPlatformInfo platformInfo,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService)
    : IRequestHandler<UpdateRestaurantPaymentSettingsCommand, Unit>
{
    private const int MaxKeyLength = 200;

    public async Task<Unit> Handle(UpdateRestaurantPaymentSettingsCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        _ = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("İşletme bulunamadı.");

        var repository = unitOfWork.Repository<RestaurantPaymentSettings>();
        var existing = await repository.GetByIdAsync(request.RestaurantId, cancellationToken);

        var newApiKey = (request.ApiKey ?? string.Empty).Trim();
        var newSecretKey = (request.SecretKey ?? string.Empty).Trim();

        if (newApiKey.Length > MaxKeyLength || newSecretKey.Length > MaxKeyLength)
        {
            throw new InvalidOperationException($"Anahtarlar en fazla {MaxKeyLength} karakter olabilir.");
        }

        string baseUrl;
        if (string.IsNullOrWhiteSpace(request.BaseUrl))
        {
            baseUrl = string.IsNullOrWhiteSpace(existing?.BaseUrl)
                ? RestaurantPaymentCredentials.DefaultBaseUrl(platformInfo.DefaultIyzicoBaseUrl)
                : existing.BaseUrl;
        }
        else
        {
            baseUrl = RestaurantPaymentCredentials.NormalizeBaseUrl(request.BaseUrl)
                ?? throw new InvalidOperationException(
                    "iyzico adresi geçersiz. Yalnızca https://api.iyzipay.com veya https://sandbox-api.iyzipay.com kullanılabilir.");
        }

        // Boş gelen anahtar kayıtlı değeri korur (yanıtta maskeli döndüğü için
        // işletme sahibi her kaydedişte yeniden yazmak zorunda kalmaz).
        var protectedApiKey = newApiKey.Length > 0
            ? secretProtection.Protect(newApiKey)
            : existing?.ApiKeyProtected ?? string.Empty;
        var protectedSecretKey = newSecretKey.Length > 0
            ? secretProtection.Protect(newSecretKey)
            : existing?.SecretKeyProtected ?? string.Empty;

        if (request.OnlinePaymentEnabled && !platformInfo.GlobalProviderIsFake)
        {
            // Birleştirme sonrası iki anahtar da bulunmalı ve çözülebilmeli
            // (JWT anahtarı değiştiyse eski şifreli değerler okunamaz).
            var merged = new RestaurantPaymentSettings
            {
                ApiKeyProtected = protectedApiKey,
                SecretKeyProtected = protectedSecretKey,
            };

            if (RestaurantPaymentCredentials.TryDecrypt(merged, secretProtection) is null)
            {
                throw new InvalidOperationException(
                    "Online ödemeyi açmak için iyzico API anahtarı ve gizli anahtarını girin.");
            }
        }

        var settings = existing ?? new RestaurantPaymentSettings(request.RestaurantId);
        settings.OnlinePaymentEnabled = request.OnlinePaymentEnabled;
        settings.Provider = RestaurantPaymentSettings.IyzicoProvider;
        settings.ApiKeyProtected = protectedApiKey;
        settings.SecretKeyProtected = protectedSecretKey;
        settings.BaseUrl = baseUrl;
        settings.UpdatedAt = DateTime.UtcNow;

        if (existing is null)
        {
            await repository.InsertAsync(settings, cancellationToken);
        }
        else
        {
            await repository.ReplaceAsync(settings, cancellationToken);
        }

        // Denetim kaydına anahtar değerleri YAZILMAZ.
        await auditLogService.RecordAsync(
            "RestaurantPaymentSettingsUpdated", nameof(RestaurantPaymentSettings), settings.Id,
            $"Online ödeme ayarları güncellendi. Açık: {(settings.OnlinePaymentEnabled ? "evet" : "hayır")}, " +
            $"anahtar değişti: {(newApiKey.Length > 0 || newSecretKey.Length > 0 ? "evet" : "hayır")}",
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}
