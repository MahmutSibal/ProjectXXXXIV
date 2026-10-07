namespace AppSukran.Application.Common.Models;

/// <summary>
/// Fatura profili yanıtı.
///
/// T.C. kimlik ve MERSİS numaraları YALNIZCA MASKELİ döner — açık değerler
/// sunucudan hiç çıkmaz. Kullanıcı düzenlerken alanı boş bırakırsa kayıtlı
/// değer korunur.
/// </summary>
public sealed record BillingProfileResponse(
    string RestaurantId,
    string ContactName,
    string Email,
    string Phone,
    string MaskedNationalId,
    string? MaskedMersisNumber,
    string AddressLine,
    string City,
    string Country,
    string PostalCode,
    bool IsComplete,
    DateTime? UpdatedAt);
