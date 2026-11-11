using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;

namespace AppSukran.Application.Payments;

/// <summary>
/// Adisyona ödeme işleme kuralları. Personelin elle işlediği ödeme ve PayTR'den gelen
/// onaylı kart ödemesi aynı kuralları kullanır.
/// </summary>
public static class BillPayments
{
    /// <summary>Tutar ödemesi. Kalan tutardan fazlası düşülmez; düşülen tutarı döner.</summary>
    public static long ApplyAmount(Bill bill, long amount)
    {
        var applied = Math.Min(amount, bill.RemainingAmount);
        bill.RemainingAmount = Math.Max(0, bill.RemainingAmount - applied);
        return applied;
    }

    /// <summary>
    /// Kalem ödemesi. <paramref name="allowedStatuses"/> içindeki kalemler "ödendi" olur.
    /// Düşülen tutarı döner.
    /// </summary>
    public static long ApplyItems(Bill bill, IReadOnlyCollection<string> itemIds, params PaymentStatus[] allowedStatuses)
    {
        var items = bill.Items
            .Where(item => itemIds.Contains(item.OrderItemId) && allowedStatuses.Contains(item.PaymentStatus))
            .ToList();

        var total = items.Sum(item => item.Price);
        foreach (var item in items)
        {
            item.PaymentStatus = PaymentStatus.Paid;
        }

        bill.RemainingAmount = Math.Max(0, bill.RemainingAmount - total);
        return total;
    }

    /// <summary>Rezerve edilmiş (Processing) kalemleri yeniden ödenebilir yapar.</summary>
    public static void ReleaseItems(Bill bill, IReadOnlyCollection<string> itemIds)
    {
        foreach (var item in bill.Items.Where(i => itemIds.Contains(i.OrderItemId) && i.PaymentStatus == PaymentStatus.Processing))
        {
            item.PaymentStatus = PaymentStatus.Unpaid;
        }
    }
}
