namespace AppSukran.Application.Common.Models;

public sealed record DailyReportResponse(
    string Date,
    long TotalRevenue,
    int OrderCount,
    long AverageBasket,
    string PeakHour,
    IReadOnlyCollection<HourlyReportItem> Hourly);

public sealed record HourlyReportItem(
    int Hour,
    string Label,
    int OrderCount,
    long TotalSales,
    long AverageBasket);
