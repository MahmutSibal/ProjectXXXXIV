namespace AppSukran.Application.Common.Models;

/// <summary>
/// Sayfalanmış liste yanıtı. Sınırsız büyüyen listelerde (denetim kaydı, sipariş
/// geçmişi, kullanıcı listesi) tüm tabloyu döndürmek yerine bunu kullanın.
/// </summary>
public sealed record PagedResult<T>(
    IReadOnlyCollection<T> Items,
    int Page,
    int PageSize,
    int TotalCount)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;

    public static PagedResult<T> Empty(int page, int pageSize) => new([], page, pageSize, 0);
}

/// <summary>
/// Sayfalama parametrelerini tek yerde doğrular. İstemciden gelen değerlere
/// güvenilmez: pageSize sınırlanmazsa "?pageSize=1000000" ile tüm tablo istenebilir.
/// </summary>
public readonly record struct PageRequest
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 200;

    public int Page { get; }
    public int PageSize { get; }

    public PageRequest(int? page, int? pageSize)
    {
        Page = page is null or < 1 ? 1 : page.Value;
        PageSize = pageSize is null or < 1
            ? DefaultPageSize
            : Math.Min(pageSize.Value, MaxPageSize);
    }

    public int Skip => (Page - 1) * PageSize;
}
