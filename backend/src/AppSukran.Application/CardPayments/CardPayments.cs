using System.Text.RegularExpressions;
using AppSukran.Application.Abstractions.Integrations;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Application.Payments;
using AppSukran.Application.Subscriptions;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Domain.Subscriptions;
using MediatR;

namespace AppSukran.Application.CardPayments;

// PayTR Direkt API akışı:
//  1) Uygulama "ödeme başlat" der; sunucu tutarı KENDİSİ hesaplar, bir CardPayment kaydı
//     açar ve PayTR'ye gidecek imzalı formu döner.
//  2) Tarayıcı kart bilgilerini forma ekleyip DOĞRUDAN PayTR'ye gönderir (sunucumuz
//     kartı hiç görmez), 3D Secure yapılır.
//  3) PayTR sonucu bildirim ucuna (callback) gönderir; ödeme YALNIZCA orada onaylanır.
//  4) Masa ödemelerinde restoranın payı ertesi sabah PayTR Platform Transfer ile
//     restoranın IBAN'ına gönderilir (PayTrTransferWorker).

/// <param name="ItemIds">Kalem seçerek ödeme. Boşsa tutar ödemesidir.</param>
/// <param name="Amount">Tutar ödemesi (kuruş). Boşsa kalan tutarın tamamı.</param>
/// <param name="Email">PayTR zorunlu tutar. Bizde SAKLANMAZ.</param>
/// <param name="UserIp">Müşterinin IP'si (controller doldurur).</param>
/// <param name="BackendBaseUrl">PayTR'nin müşteriyi döndüreceği backend adresi (controller doldurur).</param>
public sealed record StartTableCardPaymentCommand(
    string BillId,
    IReadOnlyCollection<string>? ItemIds,
    long? Amount,
    string Email,
    string ReturnPath,
    string UserIp,
    string BackendBaseUrl) : IRequest<CardPaymentStartResult>;

public sealed record StartSubscriptionCardPaymentCommand(
    string RestaurantId,
    SubscriptionPlan Plan,
    int BillingPeriodMonths,
    string Email,
    string ReturnPath,
    string UserIp,
    string BackendBaseUrl) : IRequest<CardPaymentStartResult>;

public sealed record CardPaymentStartResult(string MerchantOid, long AmountMinor, bool TestMode, string PostUrl, IReadOnlyDictionary<string, string> Fields);

/// <summary>PayTR bildirimi. Alanlar PayTR'nin gönderdiği adlarla aynıdır.</summary>
public sealed record HandlePayTrCallbackCommand(
    string MerchantOid,
    string Status,
    string TotalAmount,
    string Hash,
    string? FailedReasonCode,
    string? FailedReasonMsg) : IRequest<bool>;

public sealed record GetCardPaymentStatusQuery(string MerchantOid) : IRequest<CardPaymentStatusResponse>;

public sealed record CardPaymentStatusResponse(string MerchantOid, CardPaymentStatus Status, long AmountMinor, string? FailReason, CardPaymentPurpose Purpose);

public sealed record GetCardPaymentReturnUrlQuery(string MerchantOid, bool Success) : IRequest<string>;

internal static partial class CardPaymentRules
{
    public const int PendingLifetimeMinutes = 60;

    public static string NewMerchantOid() => "SA" + Guid.NewGuid().ToString("N");

    public static string NormalizeEmail(string? email)
    {
        var value = (email ?? string.Empty).Trim().ToLowerInvariant();
        // PayTR: en fazla 100 karakter ve Türkçe karakter içermemeli.
        if (value.Length is < 6 or > 100 || !AsciiEmail().IsMatch(value))
        {
            throw new InvalidOperationException("Geçerli bir e-posta adresi girin (Türkçe karakter olmadan).");
        }
        return value;
    }

    public static string NormalizeReturnPath(string? path)
    {
        var value = (path ?? "/").Trim();
        // Yalnızca uygulama içi yol: başka siteye yönlendirme yapılamasın.
        if (!value.StartsWith('/') || value.StartsWith("//") || value.Contains('\\') || value.Length > 300)
        {
            return "/";
        }
        return value;
    }

    public static (string Ok, string Fail) ReturnUrls(string backendBaseUrl, string merchantOid)
    {
        var baseUrl = backendBaseUrl.TrimEnd('/');
        return ($"{baseUrl}/api/paytr/return/{merchantOid}?result=ok",
                $"{baseUrl}/api/paytr/return/{merchantOid}?result=fail");
    }

    [GeneratedRegex(@"^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$")]
    private static partial Regex AsciiEmail();
}

public sealed class StartTableCardPaymentCommandHandler(
    IUnitOfWork unitOfWork,
    IPayTrService payTr,
    ICurrentUserService currentUserService,
    IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<StartTableCardPaymentCommand, CardPaymentStartResult>
{
    public async Task<CardPaymentStartResult> Handle(StartTableCardPaymentCommand request, CancellationToken cancellationToken)
    {
        if (!payTr.IsConfigured)
        {
            throw new InvalidOperationException("Kartla ödeme şu anda kullanılamıyor. Ödemeyi personele bildirin.");
        }

        var email = CardPaymentRules.NormalizeEmail(request.Email);

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var bills = unitOfWork.Repository<Bill>();
            var bill = await bills.GetByIdAsync(request.BillId, cancellationToken)
                ?? throw new InvalidOperationException("Hesap bulunamadı.");

            PaymentAuthorization.EnsureCanAccessBill(bill.RestaurantId, bill.TableNo, restaurantAccessGuard, currentUserService);
            await EnsureRestaurantAcceptsCardsAsync(bill.RestaurantId, cancellationToken);

            var itemIds = (request.ItemIds ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
            long amount;
            List<PayTrBasketLine> basket;

            if (itemIds.Count > 0)
            {
                var selected = bill.Items.Where(item => itemIds.Contains(item.OrderItemId)).ToList();
                if (selected.Count != itemIds.Count || selected.Any(item => item.PaymentStatus != PaymentStatus.Unpaid))
                {
                    throw new InvalidOperationException("Seçtiğiniz ürünlerden bazıları ödenmiş veya ödemesi sürüyor.");
                }

                // Kalemler ödeme bitene kadar rezerve edilir: aynı ürünü iki kişi aynı anda ödeyemez.
                foreach (var item in selected)
                {
                    item.PaymentStatus = PaymentStatus.Processing;
                }
                await bills.ReplaceAsync(bill, cancellationToken);

                amount = selected.Sum(item => item.Price);
                basket = selected.Select(item => new PayTrBasketLine(Truncate(item.Name, 100), item.Price, 1)).ToList();
            }
            else
            {
                amount = request.Amount ?? bill.RemainingAmount;
                if (amount <= 0 || amount > bill.RemainingAmount)
                {
                    throw new InvalidOperationException("Ödeme tutarı geçersiz.");
                }
                basket = [new PayTrBasketLine($"Masa {bill.TableNo} hesap ödemesi", amount, 1)];
            }

            if (amount < 100)
            {
                throw new InvalidOperationException("Kartla en az 1,00 TL ödenebilir.");
            }

            var merchantOid = CardPaymentRules.NewMerchantOid();
            var (okUrl, failUrl) = CardPaymentRules.ReturnUrls(request.BackendBaseUrl, merchantOid);

            await unitOfWork.Repository<CardPayment>().InsertAsync(new CardPayment
            {
                MerchantOid = merchantOid,
                Purpose = CardPaymentPurpose.TableBill,
                RestaurantId = bill.RestaurantId,
                BillId = bill.Id,
                TableNo = bill.TableNo,
                ItemIds = itemIds,
                AmountMinor = amount,
                TestMode = payTr.TestMode,
                ReturnPath = CardPaymentRules.NormalizeReturnPath(request.ReturnPath),
            }, cancellationToken);

            var form = payTr.CreatePaymentForm(new PayTrFormRequest(merchantOid, request.UserIp, email, amount, basket, okUrl, failUrl));
            await unitOfWork.CommitAsync(cancellationToken);

            return new CardPaymentStartResult(merchantOid, amount, payTr.TestMode, form.PostUrl, form.Fields);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private async Task EnsureRestaurantAcceptsCardsAsync(string restaurantId, CancellationToken cancellationToken)
    {
        var platform = await unitOfWork.Repository<PlatformPaymentSettings>()
            .GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);
        var settings = await unitOfWork.Repository<RestaurantPaymentSettings>().GetByIdAsync(restaurantId, cancellationToken);

        // IBAN ve hesap sahibi olmadan ödeme alınmaz: aksi hâlde para restorana aktarılamaz.
        if (platform is { CardPaymentsEnabled: false }
            || settings is not { OnlinePaymentEnabled: true }
            || string.IsNullOrWhiteSpace(settings.Iban)
            || (string.IsNullOrWhiteSpace(settings.AccountHolderBusinessName) && string.IsNullOrWhiteSpace(settings.AccountHolderFullName)))
        {
            throw new InvalidOperationException("Bu işletmede kartla online ödeme şu anda kullanılamıyor. Ödemeyi personele bildirin.");
        }
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}

public sealed class StartSubscriptionCardPaymentCommandHandler(
    IUnitOfWork unitOfWork,
    IPayTrService payTr,
    IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<StartSubscriptionCardPaymentCommand, CardPaymentStartResult>
{
    public async Task<CardPaymentStartResult> Handle(StartSubscriptionCardPaymentCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        if (!payTr.IsConfigured)
        {
            throw new InvalidOperationException("Kartla ödeme şu anda kullanılamıyor. Paket talebi oluşturabilirsiniz.");
        }

        if (request.Plan == SubscriptionPlan.Trial || PlanCatalog.Get(request.Plan).IsQuoteOnly)
        {
            throw new InvalidOperationException("Bu paket kartla satın alınamaz. Lütfen bizimle iletişime geçin.");
        }

        var email = CardPaymentRules.NormalizeEmail(request.Email);

        var subscriptions = await unitOfWork.Repository<Subscription>()
            .FindAsync(subscription => subscription.RestaurantId == request.RestaurantId, cancellationToken);
        _ = subscriptions.FirstOrDefault() ?? throw new InvalidOperationException("Bu işletmeye ait abonelik kaydı bulunamadı.");

        // Tutar YALNIZCA sunucuda, paket koduna göre hesaplanır.
        var quote = PlanCatalog.Quote(request.Plan, request.BillingPeriodMonths);
        var planName = PlanCatalog.Get(request.Plan).DisplayName;

        var merchantOid = CardPaymentRules.NewMerchantOid();
        var (okUrl, failUrl) = CardPaymentRules.ReturnUrls(request.BackendBaseUrl, merchantOid);

        await unitOfWork.Repository<CardPayment>().InsertAsync(new CardPayment
        {
            MerchantOid = merchantOid,
            Purpose = CardPaymentPurpose.Subscription,
            RestaurantId = request.RestaurantId,
            Plan = request.Plan,
            BillingPeriodMonths = request.BillingPeriodMonths,
            AmountMinor = quote.Total,
            TestMode = payTr.TestMode,
            ReturnPath = CardPaymentRules.NormalizeReturnPath(request.ReturnPath),
        }, cancellationToken);

        var form = payTr.CreatePaymentForm(new PayTrFormRequest(
            merchantOid, request.UserIp, email, quote.Total,
            [new PayTrBasketLine($"Şükran App {planName} paketi ({request.BillingPeriodMonths} ay)", quote.Total, 1)],
            okUrl, failUrl));

        return new CardPaymentStartResult(merchantOid, quote.Total, payTr.TestMode, form.PostUrl, form.Fields);
    }
}

public sealed class HandlePayTrCallbackCommandHandler(
    IUnitOfWork unitOfWork,
    IPayTrService payTr,
    IPosBridgeService posBridgeService,
    IAuditLogService auditLogService)
    : IRequestHandler<HandlePayTrCallbackCommand, bool>
{
    /// <returns>false: imza geçersiz (istek PayTR'den gelmemiş).</returns>
    public async Task<bool> Handle(HandlePayTrCallbackCommand request, CancellationToken cancellationToken)
    {
        // İmza doğrulanmadan HİÇBİR işlem yapılmaz: aksi hâlde herkes "ödendi" bildirimi gönderebilirdi.
        if (!payTr.VerifyCallback(request.MerchantOid, request.Status, request.TotalAmount, request.Hash))
        {
            return false;
        }

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var payments = unitOfWork.Repository<CardPayment>();
            var payment = await payments.FirstOrDefaultAsync(p => p.MerchantOid == request.MerchantOid, cancellationToken);

            // Bilinmeyen sipariş veya daha önce işlenmiş bildirim: PayTR aynı bildirimi
            // birden çok kez gönderebilir; yalnızca ilki işlenir.
            // İstisna: zaman aşımına düşürülmüş ödemenin GEÇ gelen başarılı bildirimi. Para
            // çekilmiştir; işlenmezse müşteri ödediği hâlde hesap açık kalırdı.
            var lateSuccess = payment is { Status: CardPaymentStatus.Failed, FailReason: CardPayment.TimeoutReason }
                && string.Equals(request.Status, "success", StringComparison.Ordinal);
            if (payment is null || (payment.Status != CardPaymentStatus.Pending && !lateSuccess))
            {
                await unitOfWork.CommitAsync(cancellationToken);
                return true;
            }

            var now = DateTime.UtcNow;
            payment.CompletedAt = now;
            payment.FailReason = null;

            if (string.Equals(request.Status, "success", StringComparison.Ordinal))
            {
                payment.Status = CardPaymentStatus.Succeeded;
                payment.PaidTotalMinor = long.TryParse(request.TotalAmount, out var total) ? total : payment.AmountMinor;

                if (payment.Purpose == CardPaymentPurpose.TableBill)
                {
                    await ApplyToBillAsync(payment, cancellationToken);
                    payment.TransferStatus = CardPaymentTransferStatus.Pending;
                }
                else
                {
                    await ActivateSubscriptionAsync(payment, now, cancellationToken);
                }
            }
            else
            {
                payment.Status = CardPaymentStatus.Failed;
                payment.FailReason = Truncate($"{request.FailedReasonCode} {request.FailedReasonMsg}".Trim(), 500);
                await ReleaseReservedItemsAsync(payment, cancellationToken);
            }

            await payments.ReplaceAsync(payment, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }

        await auditLogService.RecordAsync(
            "CardPaymentNotified", nameof(CardPayment), request.MerchantOid,
            $"PayTR: {request.Status}", null, cancellationToken);
        return true;
    }

    private async Task ApplyToBillAsync(CardPayment payment, CancellationToken cancellationToken)
    {
        var bills = unitOfWork.Repository<Bill>();
        var bill = await bills.GetByIdAsync(payment.BillId!, cancellationToken);
        if (bill is null)
        {
            payment.FailReason = "Ödeme alındı ancak hesap bulunamadı; personel kontrol etmeli.";
            return;
        }

        var applied = payment.ItemIds.Count > 0
            ? BillPayments.ApplyItems(bill, payment.ItemIds, PaymentStatus.Processing, PaymentStatus.Unpaid)
            : BillPayments.ApplyAmount(bill, payment.AmountMinor);

        // Kart ödemesi sürerken masa başka yoldan ödendiyse fazla tahsilat olur; iade gerekir.
        if (applied < payment.AmountMinor)
        {
            payment.FailReason = $"Fazla tahsilat: {payment.AmountMinor - applied} kuruş hesaba işlenemedi, iade gerekebilir.";
        }

        await bills.ReplaceAsync(bill, cancellationToken);
        await posBridgeService.NotifyPaymentCompletedAsync(
            new PosBridgeEvent(bill.Id, bill.RestaurantId, bill.TableNo, applied, "Card:PayTR", payment.MerchantOid), cancellationToken);
    }

    private async Task ActivateSubscriptionAsync(CardPayment payment, DateTime now, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Subscription>();
        var subscription = (await repository.FindAsync(s => s.RestaurantId == payment.RestaurantId, cancellationToken)).FirstOrDefault();
        if (subscription is null || payment.Plan is null || payment.BillingPeriodMonths is null)
        {
            payment.FailReason = "Ödeme alındı ancak abonelik bulunamadı; Süper Admin kontrol etmeli.";
            return;
        }

        var quote = PlanCatalog.Quote(payment.Plan.Value, payment.BillingPeriodMonths.Value);
        SubscriptionActivation.Activate(
            subscription, payment.Plan.Value, payment.BillingPeriodMonths.Value,
            payment.AmountMinor, quote.PriceVersion, "PayTR", now);
        await repository.ReplaceAsync(subscription, cancellationToken);
    }

    private async Task ReleaseReservedItemsAsync(CardPayment payment, CancellationToken cancellationToken)
    {
        if (payment.Purpose != CardPaymentPurpose.TableBill || payment.ItemIds.Count == 0 || payment.BillId is null)
        {
            return;
        }

        var bills = unitOfWork.Repository<Bill>();
        var bill = await bills.GetByIdAsync(payment.BillId, cancellationToken);
        if (bill is null)
        {
            return;
        }

        BillPayments.ReleaseItems(bill, payment.ItemIds);
        await bills.ReplaceAsync(bill, cancellationToken);
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}

public sealed class GetCardPaymentStatusQueryHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<GetCardPaymentStatusQuery, CardPaymentStatusResponse>
{
    public async Task<CardPaymentStatusResponse> Handle(GetCardPaymentStatusQuery request, CancellationToken cancellationToken)
    {
        var payment = await unitOfWork.Repository<CardPayment>()
            .FirstOrDefaultAsync(p => p.MerchantOid == request.MerchantOid, cancellationToken)
            ?? throw new InvalidOperationException("Ödeme bulunamadı.");

        if (payment.Purpose == CardPaymentPurpose.TableBill)
        {
            PaymentAuthorization.EnsureCanAccessBill(payment.RestaurantId, payment.TableNo ?? 0, restaurantAccessGuard, currentUserService);
        }
        else
        {
            restaurantAccessGuard.EnsureCanAccess(payment.RestaurantId);
        }

        return new CardPaymentStatusResponse(payment.MerchantOid, payment.Status, payment.AmountMinor,
            payment.Status == CardPaymentStatus.Failed ? payment.FailReason : null, payment.Purpose);
    }
}

/// <summary>PayTR'nin müşteriyi döndürdüğü adres → uygulama içi sayfa.</summary>
public sealed class GetCardPaymentReturnUrlQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetCardPaymentReturnUrlQuery, string>
{
    public async Task<string> Handle(GetCardPaymentReturnUrlQuery request, CancellationToken cancellationToken)
    {
        var payment = await unitOfWork.Repository<CardPayment>()
            .FirstOrDefaultAsync(p => p.MerchantOid == request.MerchantOid, cancellationToken);

        var path = payment?.ReturnPath ?? "/";
        var separator = path.Contains('?') ? '&' : '?';
        // Sonuç burada KESİNLEŞMEZ; sayfa durumu bildirimden sonra sunucudan sorgular.
        return $"{path}{separator}odeme={(request.Success ? "basarili" : "basarisiz")}&oid={Uri.EscapeDataString(request.MerchantOid)}";
    }
}
