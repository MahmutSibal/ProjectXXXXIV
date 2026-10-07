using FluentValidation;

namespace AppSukran.Application.Bills.Commands;

public sealed class CreateBillCommandValidator : AbstractValidator<CreateBillCommand>
{
    public CreateBillCommandValidator()
    {
        RuleFor(x => x.RestaurantId).NotEmpty();
        RuleFor(x => x.TableNo).GreaterThan(0);
        RuleFor(x => x.TableSessionId).NotEmpty();
        RuleFor(x => x.QrToken).NotEmpty();
        RuleFor(x => x.Items).NotNull().Must(items => items.Count > 0);
    }
}