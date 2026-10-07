using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Entities;

public sealed class OrderItem
{
    public string OrderItemId { get; set; } = Guid.NewGuid().ToString("N");
    public string MenuItemId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public long Price { get; set; }
    public string OrderedBy { get; set; } = string.Empty;
    public OrderItemStatus Status { get; set; }
    public PaymentStatus PaymentStatus { get; set; }
}