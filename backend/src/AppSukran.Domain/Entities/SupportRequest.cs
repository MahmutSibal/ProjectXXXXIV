using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

public sealed class SupportRequest : AggregateRoot
{
    public string? RestaurantId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public bool IsCalled { get; set; }
}
