using FluentValidation;

namespace AppSukran.Application.Orders.Commands;

public sealed class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.RestaurantId).NotEmpty();
        RuleFor(x => x.TableNo).GreaterThan(0);
        RuleFor(x => x.TableSessionId).NotEmpty();
        RuleFor(x => x.QrToken).NotEmpty();
        // Sınırlar kötüye kullanıma karşı: tek istekte binlerce kalem veya sayfalarca
        // "sipariş veren" adı mutfak ekranını ve veritabanını şişirebilirdi.
        RuleFor(x => x.Items).NotNull().Must(items => items.Count > 0)
            .Must(items => items is null || items.Count <= 100).WithMessage("Tek siparişte en fazla 100 ürün olabilir.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.MenuItemId).NotEmpty().MaximumLength(64);
            item.RuleFor(i => i.OrderedBy).MaximumLength(60).WithMessage("Sipariş veren adı en fazla 60 karakter olabilir.");
            item.RuleFor(i => i.Extras).Must(extras => extras is null || extras.Count <= 30)
                .WithMessage("Bir ürüne en fazla 30 ekstra eklenebilir.");
        });
    }
}