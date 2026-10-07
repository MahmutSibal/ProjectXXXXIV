using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

public sealed class Category : AggregateRoot
{
    public string RestaurantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
}
