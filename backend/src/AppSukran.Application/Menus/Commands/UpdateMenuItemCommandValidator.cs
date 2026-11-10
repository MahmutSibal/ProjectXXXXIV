using FluentValidation;

namespace AppSukran.Application.Menus.Commands;

public sealed class UpdateMenuItemCommandValidator : AbstractValidator<UpdateMenuItemCommand>
{
    public UpdateMenuItemCommandValidator()
    {
        RuleFor(x => x.MenuItemId).NotEmpty();
        RuleFor(x => x.Category).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        // Görsel opsiyonel; girilirse uzunluk sınırı uygulanır.
        RuleFor(x => x.ImageUrl).MaximumLength(500);
        RuleFor(x => x.AveragePreparationTime).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Calories).InclusiveBetween(0, 20000).When(x => x.Calories.HasValue);
        RuleFor(x => x.StockQuantity).InclusiveBetween(0, 1_000_000).When(x => x.StockQuantity.HasValue);
        RuleForEach(x => x.IngredientPrices).Must(price => price is null or >= 0)
            .WithMessage("Malzeme fiyatı negatif olamaz.").When(x => x.IngredientPrices is not null);
        RuleFor(x => x).Must(x => x.IngredientPrices is null || x.IngredientPrices.Count <= x.Ingredients.Count)
            .WithMessage("Malzeme fiyatı sayısı malzeme sayısından fazla olamaz.");
    }
}