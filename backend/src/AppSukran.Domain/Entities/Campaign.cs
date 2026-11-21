using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

/// <summary>
/// SuperAdmin'in gönderdiği kampanya e-postası. Alıcı listesi gönderim anında, kampanya
/// iznini (<see cref="User.MarketingConsent"/>) vermiş aktif kullanıcılardan oluşturulur.
/// </summary>
public sealed class Campaign : AggregateRoot
{
    public const string StatusSending = "Sending";
    public const string StatusCompleted = "Completed";
    public const string StatusFailed = "Failed";

    public string Subject { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    public string Status { get; set; } = StatusSending;

    public int RecipientCount { get; set; }

    public int SentCount { get; set; }

    public int FailedCount { get; set; }

    /// <summary>Görselli e-posta: üstte gösterilen görsel/GIF adresi (yalnızca https).</summary>
    public string? ImageUrl { get; set; }

    public string? ButtonText { get; set; }

    public string? ButtonUrl { get; set; }

    /// <summary>Görsel/buton içeren (HTML) bir kampanya mı?</summary>
    public bool IsRich { get; set; }

    public string? CreatedByUserId { get; set; }

    public DateTime? CompletedAt { get; set; }
}
