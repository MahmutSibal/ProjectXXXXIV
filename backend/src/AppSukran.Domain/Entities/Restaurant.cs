using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

public sealed class Restaurant : AggregateRoot
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public double Longitude { get; set; }
    public double Latitude { get; set; }
    public string Address { get; set; } = string.Empty;
    public List<RestaurantTable> Tables { get; set; } = [];
    public RestaurantFinancials Financials { get; set; } = new();
}

public sealed class RestaurantFinancials
{
    public long TotalRevenue { get; set; }
    public long MonthlyProfit { get; set; }
}