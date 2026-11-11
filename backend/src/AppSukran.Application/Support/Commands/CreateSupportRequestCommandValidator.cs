using FluentValidation;

namespace AppSukran.Application.Support.Commands;

/// <summary>Sınırlar veritabanı sütunlarıyla aynıdır; aşan istek 500 yerine anlaşılır hata alır.</summary>
public sealed class CreateSupportRequestCommandValidator : AbstractValidator<CreateSupportRequestCommand>
{
    public CreateSupportRequestCommandValidator()
    {
        RuleFor(x => x.BusinessName).NotEmpty().WithMessage("İşletme adı boş olamaz.").MaximumLength(200);
        RuleFor(x => x.Content).NotEmpty().WithMessage("Mesaj boş olamaz.").MaximumLength(2000)
            .WithMessage("Mesaj en fazla 2000 karakter olabilir.");
        RuleFor(x => x.Phone).MaximumLength(30);
        RuleFor(x => x.Topic).MaximumLength(100);
    }
}
