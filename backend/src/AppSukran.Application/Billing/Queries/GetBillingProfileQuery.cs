using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Billing.Queries;

public sealed record GetBillingProfileQuery(string RestaurantId) : IRequest<BillingProfileResponse?>;

public sealed class GetBillingProfileQueryHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<GetBillingProfileQuery, BillingProfileResponse?>
{
    public async Task<BillingProfileResponse?> Handle(
        GetBillingProfileQuery request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var profile = (await unitOfWork.Repository<BillingProfile>()
                .FindAsync(candidate => candidate.RestaurantId == request.RestaurantId, cancellationToken))
            .FirstOrDefault();

        return profile?.ToResponse();
    }
}

public static class BillingProfileMapping
{
    /// <summary>
    /// Kimlik numaraları YALNIZCA maskeli döner; açık değer API'den hiç çıkmaz.
    /// </summary>
    public static BillingProfileResponse ToResponse(this BillingProfile profile)
        => new(
            profile.RestaurantId,
            profile.ContactName,
            profile.Email,
            profile.Phone,
            profile.MaskedNationalId,
            profile.MaskedMersisNumber,
            profile.AddressLine,
            profile.City,
            profile.Country,
            profile.PostalCode,
            profile.IsComplete,
            profile.UpdatedAt);
}
