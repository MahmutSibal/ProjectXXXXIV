using FluentValidation;

namespace AppSukran.Application.CustomerCards.Commands;

public sealed class DeleteCustomerCardCommandValidator : AbstractValidator<DeleteCustomerCardCommand>
{
    public DeleteCustomerCardCommandValidator()
    {
        RuleFor(x => x.CustomerCardId).NotEmpty();
    }
}