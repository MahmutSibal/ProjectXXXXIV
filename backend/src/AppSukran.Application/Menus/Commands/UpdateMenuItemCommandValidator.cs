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
    }
}