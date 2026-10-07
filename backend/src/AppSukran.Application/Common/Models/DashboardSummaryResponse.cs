namespace AppSukran.Application.Common.Models;

public sealed record DashboardSummaryResponse(
    long DailyRevenue,
    int ActiveOrders,
    long AverageBasket,
    int ProductCount,
    int TableCount,
    int StaffCount,
    int DailyOrderCount);
