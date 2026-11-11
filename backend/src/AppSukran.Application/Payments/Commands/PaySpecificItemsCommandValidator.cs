using FluentValidation;

namespace AppSukran.Application.Payments.Commands;

public sealed class PaySpecificItemsCommandValidator : AbstractValidator<PaySpecificItemsCommand>
{
    public PaySpecificItemsCommandValidator()
    {
        RuleFor(x => x.BillId).NotEmpty();
        RuleFor(x => x.PaidByUserId).NotEmpty();
        RuleFor(x => x.ItemIds).NotNull().Must(ids => ids.Count is > 0 and <= 200);
    }
}
