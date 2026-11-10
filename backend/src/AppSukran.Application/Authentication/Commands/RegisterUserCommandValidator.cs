using FluentValidation;

namespace AppSukran.Application.Authentication.Commands;

public sealed class RegisterUserCommandValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(250);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(30)
            .Matches(@"^\+?[0-9 ()-]{10,20}$").WithMessage("Geçerli bir telefon numarası girin.")
            .When(x => !string.IsNullOrWhiteSpace(x.Phone));
        RuleFor(x => x.Address).MaximumLength(500);
    }
}
