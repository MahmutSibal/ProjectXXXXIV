using AppSukran.Application.Abstractions.Payments;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AppSukran.Infrastructure.Payments;

/// <summary>
/// İki iş yapar:
///  1) Yarım kalan ödemeler: 60 dk içinde PayTR'den sonuç gelmeyen ödeme "zaman aşımı"
///     olur ve rezerve edilen kalemler yeniden ödenebilir hâle gelir.
///  2) Restoranlara transfer: başarılı masa ödemelerinde restoranın payı (komisyon ve
///     %1 stopaj düşülerek) PayTR Platform Transfer ile restoranın IBAN'ına gönderilir.
///     PayTR kuralı: ödemeyle aynı gün transfer yapılamaz; talimat en geç 10:00'da
///     verilmelidir. Bu yüzden yalnızca Türkiye saatiyle 00:30–09:30 arasında çalışır.
/// </summary>
public sealed class PayTrTransferWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<PayTrTransferWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan TurkeyOffset = TimeSpan.FromHours(3);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(exception, "[PayTR] Transfer görevi başarısız oldu.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppSukranDbContext>();
        var payTr = scope.ServiceProvider.GetRequiredService<IPayTrService>();

        if (!payTr.IsConfigured)
        {
            return;
        }

        // Ana ve yedek sunucu aynı anda çalışırsa aynı transfer iki kez gönderilirdi.
        await using var sweepLock = await SqlApplicationLock.TryAcquireAsync(context, "AppSukran.PayTrTransfers", cancellationToken);
        if (sweepLock is null)
        {
            return;
        }

        await ExpireStalePaymentsAsync(context, cancellationToken);

        var turkeyNow = DateTime.UtcNow + TurkeyOffset;
        var minutesOfDay = turkeyNow.Hour * 60 + turkeyNow.Minute;
        if (payTr.TransfersEnabled && minutesOfDay is >= 30 and <= 570)
        {
            await SendTransfersAsync(context, payTr, turkeyNow.Date, cancellationToken);
        }
    }

    private static async Task ExpireStalePaymentsAsync(AppSukranDbContext context, CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-60);
        var stale = await context.CardPayments
            .Where(p => p.Status == CardPaymentStatus.Pending && p.CreatedAt < cutoff)
            .Take(200)
            .ToListAsync(cancellationToken);

        foreach (var payment in stale)
        {
            payment.Status = CardPaymentStatus.Failed;
            payment.FailReason = CardPayment.TimeoutReason;
            payment.CompletedAt = DateTime.UtcNow;

            if (payment.ItemIds.Count > 0 && payment.BillId is not null)
            {
                var bill = await context.Bills.FirstOrDefaultAsync(b => b.Id == payment.BillId, cancellationToken);
                if (bill is not null)
                {
                    foreach (var item in bill.Items.Where(i => payment.ItemIds.Contains(i.OrderItemId) && i.PaymentStatus == PaymentStatus.Processing))
                    {
                        item.PaymentStatus = PaymentStatus.Unpaid;
                    }
                }
            }
        }

        if (stale.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task SendTransfersAsync(AppSukranDbContext context, IPayTrService payTr, DateTime turkeyToday, CancellationToken cancellationToken)
    {
        var due = await context.CardPayments
            .Where(p => p.Status == CardPaymentStatus.Succeeded
                && p.Purpose == CardPaymentPurpose.TableBill
                && p.TransferStatus == CardPaymentTransferStatus.Pending)
            .OrderBy(p => p.CompletedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        foreach (var payment in due)
        {
            var settings = await context.RestaurantPaymentSettings.FirstOrDefaultAsync(s => s.Id == payment.RestaurantId, cancellationToken);

            // Valör: ödeme günü + hakediş günü (en az 1; PayTR aynı gün transfere izin vermez).
            var paidDay = (payment.CompletedAt ?? payment.CreatedAt).Add(TurkeyOffset).Date;
            var settlementDays = Math.Max(1, settings?.PayoutSettlementDays ?? 1);
            if (paidDay.AddDays(settlementDays) > turkeyToday)
            {
                continue;
            }

            var holder = !string.IsNullOrWhiteSpace(settings?.AccountHolderBusinessName)
                ? settings!.AccountHolderBusinessName
                : settings?.AccountHolderFullName;

            if (settings is null || string.IsNullOrWhiteSpace(settings.Iban) || string.IsNullOrWhiteSpace(holder))
            {
                MarkFailed(payment, "Restoranın IBAN veya hesap sahibi bilgisi eksik.");
                continue;
            }

            // Restorana özel oran yoksa platformun varsayılan komisyonu uygulanır.
            var commissionPercent = settings.CommissionPercent ?? payTr.DefaultCommissionPercent;

            // İade edilen kısım restorana gönderilmez. PayTR total_amount olarak ödemenin
            // tamamını bekler; restoran payı yalnızca iade sonrası kalan üzerinden hesaplanır.
            var paid = payment.PaidTotalMinor ?? payment.AmountMinor;
            var netPaid = paid - payment.RefundedMinor;
            if (netPaid <= 0)
            {
                payment.TransferStatus = CardPaymentTransferStatus.NotApplicable;
                payment.TransferError = "Ödemenin tamamı iade edildi; transfer yapılmadı.";
                continue;
            }
            var submerchant = CalculateSubmerchantAmount(netPaid, commissionPercent, payTr.FoodVatPercent);
            if (submerchant <= 0)
            {
                MarkFailed(payment, "Hesaplanan restoran payı sıfır veya negatif.");
                continue;
            }

            var transId = "TR" + Guid.NewGuid().ToString("N");
            var result = await payTr.RequestTransferAsync(new PayTrTransferRequest(
                payment.MerchantOid, transId, submerchant, paid, holder!.Trim(), settings.Iban), cancellationToken);

            payment.SubmerchantAmountMinor = submerchant;
            payment.TransferTransId = transId;
            payment.TransferRequestedAt = DateTime.UtcNow;

            if (result.Success)
            {
                payment.TransferStatus = CardPaymentTransferStatus.Requested;
                payment.TransferReference = result.Reference;
                payment.TransferError = null;
            }
            else
            {
                MarkFailed(payment, $"PayTR: {result.ErrorCode} {result.ErrorMessage}".Trim());
                logger.LogWarning("[PayTR] Transfer reddedildi {MerchantOid}: {Error}", payment.MerchantOid, payment.TransferError);
            }

            await context.SaveChangesAsync(cancellationToken);
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Restoran payı = ödenen − platform komisyonu − %1 stopaj.
    /// Stopaj, KDV hariç tutar üzerinden hesaplanır (7524 sayılı Kanun; PayTR örneği:
    /// 100 TL, %20 KDV → net 80 TL → stopaj 0,80 TL).
    /// </summary>
    internal static long CalculateSubmerchantAmount(long paidMinor, decimal commissionPercent, decimal vatPercent)
    {
        var commission = Math.Round(paidMinor * commissionPercent / 100m, MidpointRounding.AwayFromZero);
        var netExVat = paidMinor * 100m / (100m + vatPercent);
        var withholding = Math.Round(netExVat / 100m, MidpointRounding.AwayFromZero);
        return paidMinor - (long)commission - (long)withholding;
    }

    private static void MarkFailed(CardPayment payment, string error)
    {
        payment.TransferStatus = CardPaymentTransferStatus.Failed;
        payment.TransferError = error.Length <= 500 ? error : error[..500];
    }
}
