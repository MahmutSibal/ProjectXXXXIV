using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Billing.Commands;

/// <param name="NationalId">
/// Boş bırakılırsa kayıtlı değer korunur. Yanıtlarda yalnızca maskeli hâli
/// döndüğü için kullanıcı düzenlerken numarayı yeniden yazmak zorunda kalmaz.
/// </param>
/// <param name="MersisNumber">Şahıs işletmelerinde boş bırakılabilir.</param>
public sealed record SaveBillingProfileCommand(
    string RestaurantId,
    string ContactName,
    string Email,
    string Phone,
    string? NationalId,
    string? MersisNumber,
    string AddressLine,
    string City,
    string Country,
    string PostalCode) : IRequest<BillingProfileResponse>;
