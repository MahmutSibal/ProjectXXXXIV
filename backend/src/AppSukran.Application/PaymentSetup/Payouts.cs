using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.PaymentSetup;

// --- Valör ve komisyon (SuperAdmin) -------------------------------------------

/// <summary>SuperAdmin, işletmenin ödeme aktarım koşullarını belirler.</summary>
public sealed record UpdatePayoutTermsCommand(string RestaurantId, int SettlementDays, decimal CommissionPercent) : IRequest<Unit>;

public sealed class UpdatePayoutTermsCommandValidator : AbstractValidator<UpdatePayoutTermsCommand>
{
    public UpdatePayoutTermsCommandValidator()
    {
        RuleFor(x => x.RestaurantId).NotEmpty();
        RuleFor(x => x.SettlementDays).InclusiveBetween(0, 90).WithMessage("Valör 0–90 gün arasında olmalı.");
        RuleFor(x => x.CommissionPercent).InclusiveBetween(0, 100).WithMessage("Komisyon 0–100 arasında olmalı.");
    }
}

public sealed class UpdatePayoutTermsCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IAuditLogService auditLogService) : IRequestHandler<UpdatePayoutTermsCommand, Unit>
{
    public async Task<Unit> Handle(UpdatePayoutTermsCommand request, CancellationToken cancellationToken)
    {
        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            throw new UnauthorizedAccessException("Bu işlem yalnızca platform yöneticisine açıktır.");
        }

        _ = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("İşletme bulunamadı.");

        var repository = unitOfWork.Repository<RestaurantPaymentSettings>();
        var existing = await repository.GetByIdAsync(request.RestaurantId, cancellationToken);
        var settings = existing ?? new RestaurantPaymentSettings(request.RestaurantId);

        settings.PayoutSettlementDays = request.SettlementDays;
        settings.CommissionPercent = Math.Round(request.CommissionPercent, 2);
        settings.UpdatedAt = DateTime.UtcNow;

        if (existing is null)
        {
            await repository.InsertAsync(settings, cancellationToken);
        }
        else
        {
            await repository.ReplaceAsync(settings, cancellationToken);
        }

        await auditLogService.RecordAsync(
            "PayoutTermsUpdated", nameof(RestaurantPaymentSettings), settings.Id,
            $"Valör {settings.PayoutSettlementDays} gün, komisyon %{settings.CommissionPercent}.",
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}

// --- Günlük kazanç raporu -----------------------------------------------------

/// <param name="Date">Türkiye saatine göre gün (yyyy-MM-dd).</param>
/// <param name="GrossAmount">O gün verilen siparişlerin toplamı (kuruş).</param>
/// <param name="CommissionAmount">Belirlenen komisyon oranına göre platform payı (kuruş).</param>
public sealed record DailyEarningResponse(
    string Date,
    int OrderCount,
    long GrossAmount,
    long CommissionAmount,
    long NetAmount);

/// <param name="CommissionIsDefault">Restorana özel oran yok; platformun varsayılan oranı uygulanıyor.</param>
public sealed record EarningsReportResponse(
    int? SettlementDays,
    decimal? CommissionPercent,
    bool CommissionIsDefault,
    long TotalGross,
    long TotalCommission,
    long TotalNet,
    IReadOnlyCollection<DailyEarningResponse> Days);

/// <summary>
/// Son N günün sipariş adedi ve brüt tutarı. Siparişlerden hesaplanır (hesap kayıtları
/// aynı tabloda tutulduğu için hariç tutulur). İptal edilen sipariş kavramı olmadığından
/// verilen her sipariş sayılır.
/// </summary>
public sealed record GetEarningsReportQuery(string RestaurantId, int Days = 15) : IRequest<EarningsReportResponse>;

public sealed class GetEarningsReportQueryHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard,
    AppSukran.Application.Abstractions.Payments.IPayTrService payTr) : IRequestHandler<GetEarningsReportQuery, EarningsReportResponse>
{
    // Türkiye 2016'dan beri yaz saati uygulamıyor; sabit UTC+3 sunucunun saat dilimi
    // ayarına bağımlı olmadan doğru günü verir.
    private static readonly TimeSpan TurkeyOffset = TimeSpan.FromHours(3);

    public async Task<EarningsReportResponse> Handle(GetEarningsReportQuery request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var days = Math.Clamp(request.Days, 1, 90);
        var todayLocal = DateTime.UtcNow.Add(TurkeyOffset).Date;
        var firstDayLocal = todayLocal.AddDays(-(days - 1));
        var fromUtc = firstDayLocal - TurkeyOffset;

        var orders = (await unitOfWork.Repository<Order>().FindAsync(
                order => order.RestaurantId == request.RestaurantId && order.CreatedAt >= fromUtc,
                cancellationToken))
            .Where(order => order.GetType() == typeof(Order))
            .ToList();

        var settings = await unitOfWork.Repository<RestaurantPaymentSettings>()
            .GetByIdAsync(request.RestaurantId, cancellationToken);
        var commissionPercent = settings?.CommissionPercent ?? payTr.DefaultCommissionPercent;
        var rate = commissionPercent / 100m;

        var byDay = orders
            .GroupBy(order => order.CreatedAt.Add(TurkeyOffset).Date)
            .ToDictionary(group => group.Key, group => (Count: group.Count(), Gross: group.Sum(order => order.TotalAmount)));

        var rows = Enumerable.Range(0, days)
            .Select(offset => todayLocal.AddDays(-offset))
            .Select(day =>
            {
                var (count, gross) = byDay.TryGetValue(day, out var value) ? value : (0, 0L);
                var commission = (long)Math.Round(gross * rate, MidpointRounding.AwayFromZero);
                return new DailyEarningResponse(day.ToString("yyyy-MM-dd"), count, gross, commission, gross - commission);
            })
            .ToList();

        return new EarningsReportResponse(
            settings?.PayoutSettlementDays,
            commissionPercent,
            settings?.CommissionPercent is null,
            rows.Sum(row => row.GrossAmount),
            rows.Sum(row => row.CommissionAmount),
            rows.Sum(row => row.NetAmount),
            rows);
    }
}
