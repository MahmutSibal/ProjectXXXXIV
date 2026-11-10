using MediatR;

namespace AppSukran.Application.Menus.Commands;

/// <param name="IngredientPrices">Ingredients ile aynı sırada ek ücret (kuruş); null = ücretsiz.</param>
/// <param name="Calories">Porsiyon kalorisi (kcal); boş bırakılabilir.</param>
/// <param name="StockQuantity">Kalan adet; null = stok takibi yok.</param>
public sealed record CreateMenuItemCommand(
    string RestaurantId,
    string Category,
    string Name,
    string ImageUrl,
    IReadOnlyCollection<string> Ingredients,
    string? Recipe,
    int AveragePreparationTime,
    long Price,
    bool IsAvailable,
    IReadOnlyCollection<long?>? IngredientPrices = null,
    int? Calories = null,
    int? StockQuantity = null) : IRequest<string>;
