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
        RuleFor(x => x.Buyer).NotNull().WithMessage("Kartla ödemede ad soyad, e-posta, adres ve telefon zorunludur.")
            .When(x => !string.IsNullOrWhiteSpace(x.CardNumber));
        RuleFor(x => x.Buyer!).SetValidator(new PaymentBuyerValidator()).When(x => x.Buyer is not null);
    }
}