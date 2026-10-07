using FluentValidation;

namespace AppSukran.Application.CustomerCards.Commands;

public sealed class CreateCustomerCardCommandValidator : AbstractValidator<CreateCustomerCardCommand>
{
    public CreateCustomerCardCommandValidator()
    {
        RuleFor(x => x.CardholderName)
            .NotEmpty().WithMessage("Kart üzerindeki ad gerekli.")
            .MaximumLength(120)
            .Must(name => name is not null && name.Trim().Contains(' '))
            .WithMessage("Ad ve soyad birlikte girilmeli.");

        RuleFor(x => x.CardNumber)
            .NotEmpty().WithMessage("Kart numarası gerekli.")
            .Must(OnlyDigits).WithMessage("Kart numarası yalnızca rakamlardan oluşmalı.")
            .Must(BeValidLength).WithMessage("Kart numarası 13-19 hane olmalı.")
            .Must(PassLuhn).WithMessage("Kart numarası geçersiz (Luhn doğrulaması başarısız).");

        RuleFor(x => x.ExpiryMonth).InclusiveBetween(1, 12).WithMessage("Ay 1-12 arasında olmalı.");

        RuleFor(x => x.ExpiryYear).InclusiveBetween(2000, 2100).WithMessage("Yıl geçersiz.");

        RuleFor(x => x)
            .Must(x => NotExpired(x.ExpiryMonth, x.ExpiryYear))
            .WithMessage("Kartın son kullanma tarihi geçmiş.")
            .WithName("Expiry");

        RuleFor(x => x.Cvv)
            .NotEmpty().WithMessage("CVV gerekli.")
            .Must(OnlyDigits).WithMessage("CVV yalnızca rakam olmalı.")
            .Must(cvv => cvv is not null && cvv.Length is >= 3 and <= 4).WithMessage("CVV 3-4 hane olmalı.");
    }

    private static string Digits(string? value) => new((value ?? string.Empty).Where(char.IsDigit).ToArray());

    private static bool OnlyDigits(string? value) => !string.IsNullOrEmpty(value) && value.All(char.IsDigit);

    private static bool BeValidLength(string? value) => Digits(value).Length is >= 13 and <= 19;

    private static bool NotExpired(int month, int year)
    {
        if (month is < 1 or > 12 || year is < 2000 or > 2100) return false;
        var lastDay = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1).AddDays(-1);
        return lastDay >= DateTime.UtcNow.Date;
    }

    private static bool PassLuhn(string? value)
    {
        var digits = Digits(value);
        if (digits.Length is < 13 or > 19) return false;

        var sum = 0;
        var shouldDouble = false;
        for (var i = digits.Length - 1; i >= 0; i--)
        {
            var d = digits[i] - '0';
            if (shouldDouble)
            {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            shouldDouble = !shouldDouble;
        }
        return sum % 10 == 0;
    }
}