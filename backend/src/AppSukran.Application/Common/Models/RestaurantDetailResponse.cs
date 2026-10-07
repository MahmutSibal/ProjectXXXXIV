namespace AppSukran.Application.Common.Models;

public sealed record RestaurantDetailResponse(
    string Id,
    string Slug,
    string Name,
    string Address,
    double Longitude,
    double Latitude);
