using AppSukran.Application.Restaurants.Dtos;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed record GetRestaurantTablesQuery(string RestaurantId)
    : IRequest<IReadOnlyCollection<RestaurantTableSessionDto>>;
