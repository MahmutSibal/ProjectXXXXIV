using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed record CreateOrderCommand(
    string RestaurantId,
    int TableNo,
    string TableSessionId,
    string QrToken,
    IReadOnlyCollection<CreateOrderItemDto> Items) : IRequest<string>;

/// <summary>
/// Sipariş kalemi. Ad, fiyat ve durumlar istemciden GELMEZ; sunucu ürün kaydından
/// hesaplar. Name/Price/Status/PaymentStatus eski istemcilerle uyumluluk için
/// kabul edilir ama YOK SAYILIR — aksi hâlde müşteri fiyatı değiştirip ürünü
/// ucuza ya da "ödendi" olarak sipariş edebilirdi.
/// </summary>
/// <param name="Extras">Seçilen ücretli ek malzemeler (ürünün malzeme adları).</param>
public sealed record CreateOrderItemDto(
    string MenuItemId,
    string? Name = null,
    long Price = 0,
    string? OrderedBy = null,
    OrderItemStatus Status = OrderItemStatus.Pending,
    PaymentStatus PaymentStatus = PaymentStatus.Unpaid,
    IReadOnlyCollection<string>? Extras = null);
