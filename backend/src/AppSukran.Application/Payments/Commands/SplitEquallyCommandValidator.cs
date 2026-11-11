using FluentValidation;

namespace AppSukran.Application.Payments.Commands;

public sealed class SplitEquallyCommandValidator : AbstractValidator<SplitEquallyCommand>
{
    public SplitEquallyCommandValidator()
    {
        RuleFor(x => x.BillId).NotEmpty();
        RuleFor(x => x.PaidByUserId).NotEmpty();
        RuleFor(x => x.PersonCount).InclusiveBetween(1, 50);
    }
}
