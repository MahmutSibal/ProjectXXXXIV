using FluentValidation;

namespace AppSukran.Application.Payments.Commands;

public sealed class PaySpecificItemsCommandValidator : AbstractValidator<PaySpecificItemsCommand>
{
    public PaySpecificItemsCommandValidator()
    {
        RuleFor(x => x.BillId).NotEmpty();
        RuleFor(x => x.PaidByUserId).NotEmpty();
        RuleFor(x => x.ItemIds).NotNull().Must(items => items.Count > 0).WithMessage("At least one item must be selected.");
        RuleFor(x => x.CustomerCardId).NotEmpty().When(x => !string.IsNullOrWhiteSpace(x.CardNumber));
        RuleFor(x => x.CardNumber).NotEmpty().When(x => !string.IsNullOrWhiteSpace(x.CustomerCardId));
        RuleFor(x => x.Buyer).NotNull().WithMessage("Kartla ödemede ad soyad, e-posta, adres ve telefon zorunludur.")
            .When(x => !string.IsNullOrWhiteSpace(x.CardNumber));
        RuleFor(x => x.Buyer!).SetValidator(new PaymentBuyerValidator()).When(x => x.Buyer is not null);
    }
}