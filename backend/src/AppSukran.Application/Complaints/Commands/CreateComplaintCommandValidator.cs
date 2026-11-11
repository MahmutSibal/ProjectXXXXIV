using FluentValidation;

namespace AppSukran.Application.Complaints.Commands;

public sealed class CreateComplaintCommandValidator : AbstractValidator<CreateComplaintCommand>
{
    public CreateComplaintCommandValidator()
    {
        RuleFor(x => x.RestaurantName).MaximumLength(200);
        RuleFor(x => x.UserName).MaximumLength(200);
        RuleFor(x => x.Content).NotEmpty().WithMessage("Şikâyet metni boş olamaz.").MaximumLength(2000)
            .WithMessage("Şikâyet metni en fazla 2000 karakter olabilir.");
        RuleFor(x => x.RestaurantId).MaximumLength(64);
    }
}
