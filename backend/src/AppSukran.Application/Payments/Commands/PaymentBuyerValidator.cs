using AppSukran.Application.Abstractions.Payments;
using FluentValidation;

namespace AppSukran.Application.Payments.Commands;

/// <summary>
/// Kartla ödemede müşteriden alınan bilgiler. Ödeme sağlayıcısı (PayTR) dördünü de
/// zorunlu tutar; eskiden bunların yerine uydurma değerler gönderiliyordu.
/// </summary>
public sealed class PaymentBuyerValidator : AbstractValidator<PaymentBuyer>
{
    public PaymentBuyerValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Ad soyad girin.").MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-posta girin.")
            .EmailAddress().WithMessage("Geçerli bir e-posta girin.").MaximumLength(250);
        RuleFor(x => x.Address).NotEmpty().WithMessage("Adres girin.").MaximumLength(400);
        RuleFor(x => x.Phone).NotEmpty().WithMessage("Telefon girin.")
            .Matches(@"^\+?[0-9 ()-]{10,20}$").WithMessage("Geçerli bir telefon numarası girin.");
    }
}
