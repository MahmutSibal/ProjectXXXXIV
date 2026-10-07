using AppSukran.Domain.Enums;

namespace AppSukran.Application.Common.Models;

public sealed record BillResponse(
    string Id,
    string RestaurantId,
    int TableNo,
    OrderSessionStatus SessionStatus,
    IReadOnlyCollection<OrderItemResponse> Items,
    long TotalAmount,
    long RemainingAmount,
    DateTime CreatedAt);