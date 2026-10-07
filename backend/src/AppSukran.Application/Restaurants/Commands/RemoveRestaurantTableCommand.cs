using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed record RemoveRestaurantTableCommand(string RestaurantId, int TableNo) : IRequest;
