using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed record GetRestaurantByIdQuery(string RestaurantId) : IRequest<RestaurantDetailResponse?>;
