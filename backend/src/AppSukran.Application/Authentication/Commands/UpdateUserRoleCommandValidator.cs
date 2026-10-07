using AppSukran.Domain.Enums;
using FluentValidation;

namespace AppSukran.Application.Authentication.Commands;

public sealed class UpdateUserRoleCommandValidator : AbstractValidator<UpdateUserRoleCommand>
{
    public UpdateUserRoleCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Role).IsInEnum();
        RuleFor(x => x.RestaurantId)
            .NotEmpty()
            .When(x => x.Role == UserRole.RestaurantOwner)
            .WithMessage("RestaurantId is required for restaurant staff roles.");
    }
}