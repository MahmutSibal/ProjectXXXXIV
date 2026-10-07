namespace AppSukran.Application.Restaurants.Dtos;

public sealed record RestaurantTableSessionDto(int TableNo, string TableSessionId, string QrToken, string Status);