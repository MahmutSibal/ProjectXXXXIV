using FluentValidation;

namespace AppSukran.Application.Subscriptions.Commands;

public sealed class ChangePlanCommandValidator : AbstractValidator<ChangePlanCommand>
{
    public ChangePlanCommandValidator()
    {
        RuleFor(x => x.RestaurantId).NotEmpty();
        RuleFor(x => x.BillingPeriodMonths)
            .Must(months => months is 1 or 12)
            .WithMessage("Faturalama dönemi yalnızca 1 ay veya 12 ay olabilir.");
    }
}
