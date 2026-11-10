using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

public sealed class SupportRequest : AggregateRoot
{
    public string? RestaurantId { get; set; }

    /// <summary>Talebi açan kullanıcı; işletme sahibi kendi taleplerini buna göre görür.</summary>
    public string? CreatedByUserId { get; set; }

    public string BusinessName { get; set; } = string.Empty;

    /// <summary>Talebin konusu (ör. "Ödeme", "Teknik Destek"); eski kayıtlarda boş olabilir.</summary>
    public string? Topic { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public bool IsCalled { get; set; }

    /// <summary>SuperAdmin'in cevabı. Boşsa talep henüz cevaplanmamıştır.</summary>
    public string? Reply { get; set; }

    public DateTime? RepliedAt { get; set; }
}
