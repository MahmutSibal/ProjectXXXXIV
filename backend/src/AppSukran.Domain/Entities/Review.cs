using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

/// <summary>
/// Bir müşterinin bir restorana yaptığı yorum. Beğeni/beğenmeme tepkileri
/// belge içinde gömülü tutulur (kullanıcı başına tek tepki garanti edilir).
/// </summary>
public sealed class Review : AggregateRoot
{
    public string RestaurantId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;

    /// <summary>Yorum anındaki kullanıcı adı (denormalize — listelemede ekstra sorgu gerekmez).</summary>
    public string UserName { get; set; } = string.Empty;

    public string Comment { get; set; } = string.Empty;

    /// <summary>1-5 arası puan.</summary>
    public int Rating { get; set; }

    public List<ReviewReaction> Reactions { get; set; } = [];

    /// <summary>Yoruma yapılan yanıtlar (belge içinde gömülü; yorum silinince birlikte gider).</summary>
    public List<ReviewReply> Replies { get; set; } = [];
}

/// <summary>Bir yoruma verilen tek tepki (belge içinde gömülü değer nesnesi).</summary>
public sealed class ReviewReaction
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string UserId { get; set; } = string.Empty;

    /// <summary>true: beğeni, false: beğenmeme.</summary>
    public bool IsLike { get; set; }
}

/// <summary>Bir yoruma yapılan yanıt. İsteğe bağlı olarak bir kişiyi @ ile etiketler.</summary>
public sealed class ReviewReply
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;

    /// <summary>@ ile bahsedilen kişinin adı (varsa).</summary>
    public string? MentionedUserName { get; set; }

    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
