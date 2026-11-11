using FluentValidation;

namespace AppSukran.Application.Payments.Commands;

public sealed class PayCustomAmountCommandValidator : AbstractValidator<PayCustomAmountCommand>
{
    public PayCustomAmountCommandValidator()
    {
        RuleFor(x => x.BillId).NotEmpty();
        RuleFor(x => x.PaidByUserId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
    }
}
