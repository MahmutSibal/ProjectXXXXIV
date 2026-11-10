using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Billing.Queries;
using AppSukran.Application.Common.Models;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Billing.Commands;

public sealed class SaveBillingProfileCommandHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService)
    : IRequestHandler<SaveBillingProfileCommand, BillingProfileResponse>
{
    public async Task<BillingProfileResponse> Handle(
        SaveBillingProfileCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var repository = unitOfWork.Repository<BillingProfile>();
        var existing = (await repository.FindAsync(
                profile => profile.RestaurantId == request.RestaurantId, cancellationToken))
            .FirstOrDefault();

        // Ad, e-posta ve telefon işletme sahibinin hesabında zaten var; form bunları
        // yeniden sormaz. Gönderilmezse kayıtlı değer, o da yoksa hesap bilgisi kullanılır.
        var owner = await FindOwnerAsync(request.RestaurantId, cancellationToken);

        var contactName = Require(
            FirstFilled(request.ContactName, existing?.ContactName, owner?.Name), "Ad soyad", minLength: 3, maxLength: 150);
        var email = Require(
            FirstFilled(request.Email, existing?.Email, owner?.Email), "E-posta", minLength: 5, maxLength: 320).ToLowerInvariant();
        if (!email.Contains('@') || email.StartsWith('@') || email.EndsWith('@'))
        {
            throw new InvalidOperationException("Geçerli bir e-posta adresi girin.");
        }

        var phone = PhoneNumber.Normalize(FirstFilled(request.Phone, existing?.Phone, owner?.Phone));
        if (!PhoneNumber.IsPlausible(phone))
        {
            throw new InvalidOperationException("Geçerli bir telefon numarası girin.");
        }

        // Boş gelirse kayıtlı değer korunur (yanıtta maskeli döndüğü için
        // kullanıcı numarayı yeniden yazmak zorunda değildir).
        var nationalId = string.IsNullOrWhiteSpace(request.NationalId)
            ? existing?.NationalId
            : new string(request.NationalId.Where(char.IsAsciiDigit).ToArray());

        if (string.IsNullOrWhiteSpace(nationalId))
        {
            throw new InvalidOperationException("T.C. kimlik numarası zorunludur.");
        }

        if (!TurkishIdentity.IsValidNationalId(nationalId))
        {
            throw new InvalidOperationException("T.C. kimlik numarası geçersiz. Lütfen kontrol edin.");
        }

        var mersis = string.IsNullOrWhiteSpace(request.MersisNumber)
            ? existing?.MersisNumber
            : new string(request.MersisNumber.Where(char.IsAsciiDigit).ToArray());

        // MERSİS şahıs işletmelerinde yoktur; verildiyse doğru olmalıdır.
        if (!string.IsNullOrWhiteSpace(mersis) && !TurkishIdentity.IsValidMersis(mersis))
        {
            throw new InvalidOperationException("MERSİS numarası 16 haneli olmalıdır.");
        }

        var addressLine = Require(request.AddressLine, "Fatura adresi", minLength: 10, maxLength: 500);
        var city = Require(request.City, "İl", minLength: 2, maxLength: 100);
        // Platform yalnızca Türkiye'de hizmet veriyor; ülke sorulmaz.
        var country = Require(FirstFilled(request.Country, existing?.Country, "Türkiye"), "Ülke", minLength: 2, maxLength: 100);

        var postalCode = new string((request.PostalCode ?? string.Empty).Where(char.IsAsciiDigit).ToArray());
        if (!TurkishIdentity.IsValidPostalCode(postalCode))
        {
            throw new InvalidOperationException("Posta kodu 5 haneli olmalıdır.");
        }

        var profile = existing ?? new BillingProfile { RestaurantId = request.RestaurantId };

        profile.ContactName = contactName;
        profile.Email = email;
        profile.Phone = phone;
        profile.NationalId = nationalId;
        profile.MersisNumber = string.IsNullOrWhiteSpace(mersis) ? null : mersis;
        profile.AddressLine = addressLine;
        profile.City = city;
        profile.Country = country;
        profile.PostalCode = postalCode;
        profile.UpdatedAt = DateTime.UtcNow;

        if (existing is null)
        {
            await repository.InsertAsync(profile, cancellationToken);
        }
        else
        {
            await repository.ReplaceAsync(profile, cancellationToken);
        }

        // Denetim kaydına HASSAS VERİ YAZILMAZ; yalnızca maskeli hâli.
        await auditLogService.RecordAsync(
            "BillingProfileUpdated", nameof(BillingProfile), profile.Id,
            $"Fatura bilgileri güncellendi. Kimlik: {profile.MaskedNationalId}",
            currentUserService.UserId, cancellationToken);

        return profile.ToResponse();
    }

    private static string? FirstFilled(params string?[] values)
        => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

    private async Task<User?> FindOwnerAsync(string restaurantId, CancellationToken cancellationToken)
    {
        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(restaurantId, cancellationToken);
        return string.IsNullOrWhiteSpace(restaurant?.OwnerId)
            ? null
            : await unitOfWork.Repository<User>().GetByIdAsync(restaurant.OwnerId, cancellationToken);
    }

    private static string Require(string? value, string fieldName, int minLength, int maxLength)
    {
        var trimmed = (value ?? string.Empty).Trim();

        if (trimmed.Length == 0)
        {
            throw new InvalidOperationException($"{fieldName} zorunludur.");
        }

        if (trimmed.Length < minLength)
        {
            throw new InvalidOperationException($"{fieldName} en az {minLength} karakter olmalıdır.");
        }

        return trimmed.Length > maxLength ? trimmed[..maxLength] : trimmed;
    }
}
