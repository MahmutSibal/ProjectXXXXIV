using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Entities;

public sealed class RestaurantTable
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public int TableNo { get; set; }
    public string QrToken { get; set; } = string.Empty;
    public string TableSessionId { get; set; } = string.Empty;
    public DateTime? SessionOpenedAt { get; set; }
    public DateTime? SessionClosedAt { get; set; }
    public RestaurantTableStatus Status { get; set; }
}