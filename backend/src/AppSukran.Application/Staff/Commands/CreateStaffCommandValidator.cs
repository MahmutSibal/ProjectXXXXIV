using AppSukran.Domain.Enums;
using FluentValidation;

namespace AppSukran.Application.Staff.Commands;

public sealed class CreateStaffCommandValidator : AbstractValidator<CreateStaffCommand>
{
    public CreateStaffCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(250);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(200);
        RuleFor(x => x.Role)
            .Must(role => role is UserRole.Kitchen or UserRole.Waiter)
            .WithMessage("Personel rolü yalnızca Kitchen veya Waiter olabilir.");
    }
}
