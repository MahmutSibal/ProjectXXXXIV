using AppSukran.Domain.Enums;
using FluentValidation;

namespace AppSukran.Application.Authentication.Commands;

public sealed class RegisterUserCommandValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(250);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(200);
        RuleFor(x => x.Role).NotEqual(UserRole.SuperAdmin);
        RuleFor(x => x.RestaurantId)
            .NotEmpty()
            .When(x => x.Role == UserRole.RestaurantOwner)
            .WithMessage("RestaurantId is required for restaurant staff roles.");
    }
}