using AppSukran.Domain.Common;
using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Entities;

public class Order : AggregateRoot
{
    public string RestaurantId { get; set; } = string.Empty;
    public int TableNo { get; set; }
    public OrderSessionStatus SessionStatus { get; set; } = OrderSessionStatus.Active;
    public List<OrderItem> Items { get; set; } = [];
    public long TotalAmount { get; set; }
    public long RemainingAmount { get; set; }
}