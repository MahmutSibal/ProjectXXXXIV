using FluentValidation;

namespace AppSukran.Application.Authentication.Commands;

public sealed class CreateQrSessionCommandValidator : AbstractValidator<CreateQrSessionCommand>
{
    public CreateQrSessionCommandValidator()
    {
        RuleFor(command => command.RestaurantId).NotEmpty();
        RuleFor(command => command.TableNo).GreaterThan(0);
        RuleFor(command => command.QrToken).NotEmpty();
    }
}
