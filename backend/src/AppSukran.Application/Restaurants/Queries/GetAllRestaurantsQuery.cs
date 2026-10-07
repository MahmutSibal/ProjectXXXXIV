using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

/// Tum restoranlari listeler (SuperAdmin panel restoran seciciisi icin).
public sealed record GetAllRestaurantsQuery : IRequest<IReadOnlyCollection<RestaurantDetailResponse>>;
