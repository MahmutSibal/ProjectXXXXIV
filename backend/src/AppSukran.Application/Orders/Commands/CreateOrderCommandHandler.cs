using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed class CreateOrderCommandHandler(IUnitOfWork unitOfWork, IOrderRealtimePublisher orderRealtimePublisher, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard, ISubscriptionGuard subscriptionGuard)
    : IRequestHandler<CreateOrderCommand, string>
{
    public async Task<string> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);
        // Aboneliği biten işletmede yeni sipariş alınamaz.
        // Paketin sipariş sistemi içerip içermediğini ve dönemlik QR sipariş
        // limitini de denetler (Lite'ta sipariş alınamaz).
        await subscriptionGuard.EnsureCanCreateOrderAsync(request.RestaurantId, cancellationToken);

        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        var table = restaurant.Tables.FirstOrDefault(candidate => candidate.TableNo == request.TableNo)
            ?? throw new InvalidOperationException("Table not found.");

        if (table.Status != RestaurantTableStatus.Occupied ||
            table.TableSessionId != request.TableSessionId ||
            table.QrToken != request.QrToken ||
            table.SessionClosedAt.HasValue)
        {
            throw new InvalidOperationException("Invalid or expired table session.");
        }

        var menuRepository = unitOfWork.Repository<MenuItem>();
        var requestedIds = request.Items.Select(item => item.MenuItemId).Distinct().ToList();
        var menuItems = (await menuRepository.FindAsync(
                item => requestedIds.Contains(item.Id) && item.RestaurantId == request.RestaurantId,
                cancellationToken))
            .ToDictionary(item => item.Id);

        // Fiyat, ad ve durumlar ürün kaydından hesaplanır; istemcinin gönderdikleri yok sayılır.
        var orderItems = new List<OrderItem>();
        foreach (var requested in request.Items)
        {
            if (!menuItems.TryGetValue(requested.MenuItemId, out var menuItem))
            {
                throw new InvalidOperationException("Siparişteki bir ürün bu işletmenin menüsünde bulunamadı.");
            }

            if (!menuItem.IsAvailable)
            {
                throw new InvalidOperationException($"{menuItem.Name} şu anda satışta değil.");
            }

            var extras = (requested.Extras ?? [])
                .Select(extra => extra?.Trim())
                .Where(extra => !string.IsNullOrWhiteSpace(extra))
                .Select(extra => extra!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            long price = menuItem.Price;
            foreach (var extra in extras)
            {
                price += menuItem.PriceOfIngredient(extra)
                    ?? throw new InvalidOperationException($"{menuItem.Name} için \"{extra}\" seçilemez.");
            }

            orderItems.Add(new OrderItem
            {
                MenuItemId = menuItem.Id,
                Name = menuItem.Name,
                Price = price,
                Extras = extras,
                OrderedBy = (requested.OrderedBy ?? string.Empty).Trim(),
                Status = OrderItemStatus.Pending,
                PaymentStatus = PaymentStatus.Unpaid,
            });
        }

        // Stok takibi yapılan ürünlerde yeterli adet var mı? Her kalem bir adettir.
        var quantities = orderItems.GroupBy(item => item.MenuItemId).ToDictionary(group => group.Key, group => group.Count());
        var stockTracked = menuItems.Values.Where(item => item.StockQuantity.HasValue && quantities.ContainsKey(item.Id)).ToList();
        foreach (var menuItem in stockTracked)
        {
            if (menuItem.StockQuantity!.Value < quantities[menuItem.Id])
            {
                throw new InvalidOperationException(menuItem.StockQuantity.Value == 0
                    ? $"{menuItem.Name} tükendi."
                    : $"{menuItem.Name} için stokta yalnızca {menuItem.StockQuantity.Value} adet kaldı.");
            }
        }

        var order = new Order
        {
            RestaurantId = request.RestaurantId,
            TableNo = request.TableNo,
            Items = orderItems,
            SessionStatus = OrderSessionStatus.Active,
            TotalAmount = orderItems.Sum(item => item.Price),
            RemainingAmount = orderItems.Sum(item => item.Price)
        };

        // Stok düşümü ile sipariş kaydı birlikte yapılır; biri başarısız olursa ikisi de geri alınır.
        // Aynı anda gelen iki sipariş aynı son ürünü alırsa sürüm (Version) alanı çakışmayı yakalar.
        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            foreach (var menuItem in stockTracked)
            {
                menuItem.StockQuantity -= quantities[menuItem.Id];
                await menuRepository.ReplaceAsync(menuItem, cancellationToken);
            }

            await unitOfWork.Repository<Order>().InsertAsync(order, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }

        await orderRealtimePublisher.PublishOrderCreatedAsync(order, cancellationToken);
        await auditLogService.RecordAsync("OrderCreated", nameof(Order), order.Id, $"Restaurant {order.RestaurantId}, Table {order.TableNo}.", currentUserService.UserId, cancellationToken);
        return order.Id;
    }
}
