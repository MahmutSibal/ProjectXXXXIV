using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

public sealed class Event : AggregateRoot
{
    public string RestaurantId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;   // serbest metin: "28 Haziran 2026"
    public string Time { get; set; } = string.Empty;   // "20:30"
    public string Location { get; set; } = string.Empty;
    public long Price { get; set; }                     // kuruş cinsinden
    public bool IsFree { get; set; }
    public List<string> Tags { get; set; } = [];
    public bool IsPublished { get; set; } = true;
}
