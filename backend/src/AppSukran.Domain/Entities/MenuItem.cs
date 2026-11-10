using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

public sealed class MenuItem : AggregateRoot
{
    public string RestaurantId { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public List<string> Ingredients { get; set; } = [];

    /// <summary>
    /// <see cref="Ingredients"/> ile aynı sırada, müşterinin seçince ödediği ek ücret (kuruş).
    /// null = ücretsiz / seçilemeyen standart malzeme. Liste boşsa hiçbir malzeme ücretli değildir.
    /// </summary>
    public List<long?> IngredientPrices { get; set; } = [];

    public string? Recipe { get; set; }
    public int AveragePreparationTime { get; set; }
    public long Price { get; set; }
    public bool IsAvailable { get; set; } = true;

    /// <summary>Porsiyon kalorisi (kcal). Girilmediyse null.</summary>
    public int? Calories { get; set; }

    /// <summary>
    /// Kalan stok (adet). null = stok takibi yapılmıyor. Sipariş verildikçe sunucuda düşülür;
    /// sıfıra inince ürün sipariş edilemez.
    /// </summary>
    public int? StockQuantity { get; set; }

    /// <summary>Seçilen ücretli malzemenin fiyatı; ürünün malzemesi değilse null.</summary>
    public long? PriceOfIngredient(string ingredient)
    {
        var index = Ingredients.FindIndex(name => string.Equals(name, ingredient, StringComparison.OrdinalIgnoreCase));
        if (index < 0)
        {
            return null;
        }

        return index < IngredientPrices.Count ? IngredientPrices[index] ?? 0 : 0;
    }
}
