using AppSukran.Domain.Enums;

namespace AppSukran.Application.Common.Models;

public sealed record OrderItemResponse(
    string OrderItemId,
    string MenuItemId,
    string Name,
    long Price,
    string OrderedBy,
    OrderItemStatus Status,
    PaymentStatus PaymentStatus);