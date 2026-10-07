using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Reports.Queries;

public sealed class GetDashboardSummaryQueryHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetDashboardSummaryQuery, DashboardSummaryResponse>
{
    public async Task<DashboardSummaryResponse> Handle(GetDashboardSummaryQuery request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        var orders = await unitOfWork.Repository<Order>()
            .FindAsync(o => o.RestaurantId == restaurantId, cancellationToken);

        var today = DateTime.UtcNow.Date;
        var dailyOrders = orders.Where(o => o.CreatedAt.Date == today).ToList();
        var dailyRevenue = dailyOrders.Sum(o => o.TotalAmount);
        var dailyOrderCount = dailyOrders.Count;
        var activeOrders = orders.Count(o => o.SessionStatus == OrderSessionStatus.Active);
        var averageBasket = dailyOrderCount > 0 ? dailyRevenue / dailyOrderCount : 0;

        var products = await unitOfWork.Repository<MenuItem>()
            .FindAsync(m => m.RestaurantId == restaurantId, cancellationToken);

        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(restaurantId, cancellationToken);
        var tableCount = restaurant?.Tables.Count ?? 0;

        var staff = await unitOfWork.Repository<User>()
            .FindAsync(u => u.RestaurantId == restaurantId
                && (u.Role == UserRole.Kitchen || u.Role == UserRole.Waiter), cancellationToken);

        return new DashboardSummaryResponse(
            dailyRevenue,
            activeOrders,
            averageBasket,
            products.Count,
            tableCount,
            staff.Count,
            dailyOrderCount);
    }
}
