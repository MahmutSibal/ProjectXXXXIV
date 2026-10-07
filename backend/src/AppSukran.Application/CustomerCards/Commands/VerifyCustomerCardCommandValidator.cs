using FluentValidation;

namespace AppSukran.Application.CustomerCards.Commands;

public sealed class VerifyCustomerCardCommandValidator : AbstractValidator<VerifyCustomerCardCommand>
{
    public VerifyCustomerCardCommandValidator()
    {
        RuleFor(x => x.CustomerCardId).NotEmpty();
        RuleFor(x => x.CardNumber).NotEmpty().MinimumLength(13).MaximumLength(19);
    }
}