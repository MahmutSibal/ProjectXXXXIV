using AppSukran.Domain.Enums;
using FluentValidation;

namespace AppSukran.Application.Authentication.Commands;

public sealed class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(250);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(200);
        // SuperAdmin panelden oluşturulamaz. RestaurantId opsiyoneldir:
        // sahip ataması restoran oluşturulurken yapılır.
        RuleFor(x => x.Role).NotEqual(UserRole.SuperAdmin);
    }
}
