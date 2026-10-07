using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

public sealed class MenuItem : AggregateRoot
{
    public string RestaurantId { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public List<string> Ingredients { get; set; } = [];
    public string? Recipe { get; set; }
    public int AveragePreparationTime { get; set; }
    public long Price { get; set; }
    public bool IsAvailable { get; set; } = true;
}