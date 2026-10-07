using FluentValidation;

namespace AppSukran.Application.Orders.Commands;

public sealed class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.RestaurantId).NotEmpty();
        RuleFor(x => x.TableNo).GreaterThan(0);
        RuleFor(x => x.TableSessionId).NotEmpty();
        RuleFor(x => x.QrToken).NotEmpty();
        RuleFor(x => x.Items).NotNull().Must(items => items.Count > 0);
    }
}