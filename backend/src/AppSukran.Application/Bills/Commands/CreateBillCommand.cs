using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Bills.Commands;

/// <summary>
/// Masanın hesabını çıkarır. Kalemler ve tutar masanın sunucudaki açık siparişlerinden
/// hesaplanır; <see cref="Items"/> eski istemcilerle uyumluluk için kabul edilir ama
/// YOK SAYILIR — aksi hâlde müşteri hesabı istediği düşük tutarla açıp yalnızca onu öderdi.
/// </summary>
public sealed record CreateBillCommand(
    string RestaurantId,
    int TableNo,
    string TableSessionId,
    string QrToken,
    IReadOnlyCollection<CreateBillItemDto>? Items = null) : IRequest<string>;

public sealed record CreateBillItemDto(string MenuItemId, string Name, long Price, string OrderedBy, OrderItemStatus Status, PaymentStatus PaymentStatus);
