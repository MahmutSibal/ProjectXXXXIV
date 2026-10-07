using FluentValidation;

namespace AppSukran.Application.Payments.Commands;

public sealed class SplitEquallyCommandValidator : AbstractValidator<SplitEquallyCommand>
{
    public SplitEquallyCommandValidator()
    {
        RuleFor(x => x.BillId).NotEmpty();
        RuleFor(x => x.PaidByUserId).NotEmpty();
        RuleFor(x => x.PersonCount).GreaterThan(0).LessThanOrEqualTo(100);
        RuleFor(x => x.CustomerCardId).NotEmpty().When(x => !string.IsNullOrWhiteSpace(x.CardNumber));
        RuleFor(x => x.CardNumber).NotEmpty().When(x => !string.IsNullOrWhiteSpace(x.CustomerCardId));
    }
}