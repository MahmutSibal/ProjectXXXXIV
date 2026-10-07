using AppSukran.Application.Restaurants.Dtos;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed record ValidateTableSessionQuery(string RestaurantId, int TableNo, string QrToken) : IRequest<RestaurantTableSessionDto?>;
