using System.Globalization;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Reports.Queries;

public sealed class GetDailyReportQueryHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetDailyReportQuery, DailyReportResponse>
{
    public async Task<DailyReportResponse> Handle(GetDailyReportQuery request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        var day = ParseDate(request.Date);

        var orders = await unitOfWork.Repository<Order>()
            .FindAsync(o => o.RestaurantId == restaurantId, cancellationToken);

        var dayOrders = orders.Where(o => o.CreatedAt.Date == day).ToList();

        var hourly = dayOrders
            .GroupBy(o => o.CreatedAt.Hour)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var count = g.Count();
                var sales = g.Sum(o => o.TotalAmount);
                return new HourlyReportItem(
                    g.Key,
                    $"{g.Key:00}:00",
                    count,
                    sales,
                    count > 0 ? sales / count : 0);
            })
            .ToList();

        var totalRevenue = dayOrders.Sum(o => o.TotalAmount);
        var orderCount = dayOrders.Count;
        var averageBasket = orderCount > 0 ? totalRevenue / orderCount : 0;
        var peakHour = hourly.Count > 0
            ? hourly.OrderByDescending(h => h.TotalSales).First().Label
            : "-";

        return new DailyReportResponse(
            day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            totalRevenue,
            orderCount,
            averageBasket,
            peakHour,
            hourly);
    }

    private static DateTime ParseDate(string? raw)
    {
        if (!string.IsNullOrWhiteSpace(raw) &&
            DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed))
        {
            return parsed.Date;
        }

        return DateTime.UtcNow.Date;
    }
}
