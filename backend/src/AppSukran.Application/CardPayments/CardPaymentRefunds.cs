using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.CardPayments;

// Kartla alınan ödemelerin listesi ve PayTR üzerinden karta iade.
//
// Kural: Restorana para transferi yapılmadan ÖNCE iade, restoran sahibi tarafından
// yapılabilir; restoran payı iade sonrası kalan üzerinden hesaplanır. Transfer yapıldıktan
// SONRA iade yalnızca Süper Admin tarafından yapılır (para restorana gönderilmiş olduğu
// için iade platform bakiyesinden çıkar; restorandan mahsup edilmesi gerekir).
// Abonelik ödemelerini yalnızca Süper Admin iade eder.

public sealed record CardPaymentListItem(
    string MerchantOid,
    CardPaymentPurpose Purpose,
    int? TableNo,
    long AmountMinor,
    long RefundedMinor,
    long RefundableMinor,
    CardPaymentStatus Status,
    CardPaymentTransferStatus TransferStatus,
    bool TestMode,
    DateTime CreatedAt,
    DateTime? CompletedAt);

public sealed record GetCardPaymentsQuery(string RestaurantId, int Days = 30) : IRequest<IReadOnlyCollection<CardPaymentListItem>>;

public sealed record RefundCardPaymentCommand(string MerchantOid, long? AmountMinor, string? Reason) : IRequest<CardPaymentListItem>;

public sealed class RefundCardPaymentCommandValidator : AbstractValidator<RefundCardPaymentCommand>
{
    public RefundCardPaymentCommandValidator()
    {
        RuleFor(x => x.MerchantOid).NotEmpty().MaximumLength(64);
        RuleFor(x => x.AmountMinor).GreaterThan(0).When(x => x.AmountMinor.HasValue)
            .WithMessage("İade tutarı sıfırdan büyük olmalı.");
        RuleFor(x => x.Reason).MaximumLength(300);
    }
}

internal static class CardPaymentMapping
{
    public static CardPaymentListItem ToItem(CardPayment p) => new(
        p.MerchantOid, p.Purpose, p.TableNo, p.PaidTotalMinor ?? p.AmountMinor, p.RefundedMinor, p.RefundableMinor,
        p.Status, p.TransferStatus, p.TestMode, p.CreatedAt, p.CompletedAt);
}

public sealed class GetCardPaymentsQueryHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<GetCardPaymentsQuery, IReadOnlyCollection<CardPaymentListItem>>
{
    public async Task<IReadOnlyCollection<CardPaymentListItem>> Handle(GetCardPaymentsQuery request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);
        var since = DateTime.UtcNow.AddDays(-Math.Clamp(request.Days, 1, 180));

        var payments = await unitOfWork.Repository<CardPayment>().FindAsync(
            p => p.RestaurantId == request.RestaurantId && p.CreatedAt >= since && p.Status != CardPaymentStatus.Pending,
            cancellationToken);

        return payments.OrderByDescending(p => p.CreatedAt).Select(CardPaymentMapping.ToItem).ToList();
    }
}

public sealed class RefundCardPaymentCommandHandler(
    IUnitOfWork unitOfWork,
    IPayTrService payTr,
    ICurrentUserService currentUserService,
    IRestaurantAccessGuard restaurantAccessGuard,
    IAuditLogService auditLogService) : IRequestHandler<RefundCardPaymentCommand, CardPaymentListItem>
{
    public async Task<CardPaymentListItem> Handle(RefundCardPaymentCommand request, CancellationToken cancellationToken)
    {
        if (!payTr.IsConfigured)
        {
            throw new InvalidOperationException("Kart iadesi şu anda kullanılamıyor.");
        }

        var repository = unitOfWork.Repository<CardPayment>();
        var payment = await repository.FirstOrDefaultAsync(p => p.MerchantOid == request.MerchantOid, cancellationToken)
            ?? throw new InvalidOperationException("Ödeme bulunamadı.");

        restaurantAccessGuard.EnsureCanAccess(payment.RestaurantId);
        var isSuperAdmin = currentUserService.IsInRole(nameof(UserRole.SuperAdmin));

        if (payment.Status != CardPaymentStatus.Succeeded)
        {
            throw new InvalidOperationException("Yalnızca başarılı ödemeler iade edilebilir.");
        }

        if (payment.Purpose == CardPaymentPurpose.Subscription && !isSuperAdmin)
        {
            throw new UnauthorizedAccessException("Abonelik ödemelerini yalnızca Süper Admin iade edebilir.");
        }

        var transferred = payment.TransferStatus == CardPaymentTransferStatus.Requested;
        if (transferred && !isSuperAdmin)
        {
            throw new InvalidOperationException(
                "Bu ödemenin restoran payı hesabınıza aktarıldı. İade için Süper Admin ile iletişime geçin.");
        }

        var amount = request.AmountMinor ?? payment.RefundableMinor;
        if (amount <= 0 || amount > payment.RefundableMinor)
        {
            throw new InvalidOperationException(
                $"İade tutarı en fazla {payment.RefundableMinor / 100m:N2} TL olabilir.");
        }

        // Aynı iadenin iki kez gönderilmemesi için benzersiz referans.
        var reference = "RF" + Guid.NewGuid().ToString("N")[..30];
        var result = await payTr.RefundAsync(payment.MerchantOid, amount, reference, cancellationToken);
        if (!result.Success)
        {
            throw new InvalidOperationException($"PayTR iadeyi reddetti: {result.ErrorMessage}");
        }

        payment.RefundedMinor += amount;
        payment.LastRefundAt = DateTime.UtcNow;
        if (payment.RefundableMinor == 0 && payment.TransferStatus == CardPaymentTransferStatus.Pending)
        {
            // Tamamı iade edildi; restorana gönderilecek bir şey kalmadı.
            payment.TransferStatus = CardPaymentTransferStatus.NotApplicable;
        }
        await repository.ReplaceAsync(payment, cancellationToken);

        var note = transferred
            ? " DİKKAT: restoran payı daha önce aktarılmıştı; iade edilen tutar restorandan mahsup edilmeli."
            : string.Empty;
        await auditLogService.RecordAsync("CardPaymentRefunded", nameof(CardPayment), payment.MerchantOid,
            $"Karta iade: {amount / 100m:N2} TL. Sebep: {request.Reason ?? "-"}.{note}",
            currentUserService.UserId, cancellationToken);

        return CardPaymentMapping.ToItem(payment);
    }
}
