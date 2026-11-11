using System.Net;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.CardPayments;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace AppSukran.API.Controllers;

/// <summary>
/// PayTR ile kartla ödeme (iFrame API). Kart bilgisi bu uçlara HİÇ gelmez: başlat uçları
/// PayTR'nin güvenli ödeme sayfasını döner, müşteri kartı orada girer (3D Secure dahil).
/// </summary>
[ApiController]
[Route("api/paytr")]
public sealed class PayTrController(IMediator mediator, IPayTrService payTr, IOptions<Infrastructure.Settings.PayTrSettings> settings) : ControllerBase
{
    /// <summary>Kartla ödeme açık mı? (Arayüz buna göre kart formunu gösterir.)</summary>
    [HttpGet("status")]
    [AllowAnonymous]
    public ActionResult<PayTrStatusResponse> Status()
        => Ok(new PayTrStatusResponse(payTr.IsConfigured, payTr.IsConfigured && payTr.TestMode));

    /// <summary>QR müşterisinin masadan kartla ödemesi.</summary>
    [HttpPost("table-payments")]
    [Authorize(Roles = "Customer")]
    [EnableRateLimiting("payments-write")]
    public async Task<ActionResult<CardPaymentStartResult>> StartTablePayment(
        [FromBody] StartTablePaymentRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new StartTableCardPaymentCommand(
            request.BillId, request.ItemIds, request.Amount, request.ToBuyer(), request.ReturnPath ?? "/",
            ClientIp(), BackendBaseUrl()), cancellationToken));

    /// <summary>İşletme sahibinin paket ödemesi.</summary>
    [HttpPost("subscription-payments")]
    [Authorize(Roles = "RestaurantOwner")]
    [EnableRateLimiting("payments-write")]
    public async Task<ActionResult<CardPaymentStartResult>> StartSubscriptionPayment(
        [FromBody] StartSubscriptionPaymentRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new StartSubscriptionCardPaymentCommand(
            request.RestaurantId, request.Plan, request.BillingPeriodMonths, request.ToBuyer(),
            request.ReturnPath ?? "/admin/subscription", ClientIp(), BackendBaseUrl()), cancellationToken));

    /// <summary>Restoranın kartla alınan ödemeleri (son N gün).</summary>
    [HttpGet("restaurants/{restaurantId}/payments")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    public async Task<ActionResult<IReadOnlyCollection<CardPaymentListItem>>> List(string restaurantId, [FromQuery] int days = 30, CancellationToken cancellationToken = default)
        => Ok(await mediator.Send(new GetCardPaymentsQuery(restaurantId, days), cancellationToken));

    /// <summary>Kart ödemesini (tamamen veya kısmen) PayTR üzerinden karta iade eder.</summary>
    [HttpPost("payments/{merchantOid}/refund")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    [EnableRateLimiting("payments-write")]
    public async Task<ActionResult<CardPaymentListItem>> Refund(string merchantOid, [FromBody] RefundCardPaymentRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new RefundCardPaymentCommand(merchantOid, request.AmountMinor, request.Reason), cancellationToken));

    /// <summary>Ödemenin sonucu (sayfa, PayTR'den döndükten sonra bunu sorgular).</summary>
    [HttpGet("payments/{merchantOid}")]
    [Authorize]
    public async Task<ActionResult<CardPaymentStatusResponse>> GetStatus(string merchantOid, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetCardPaymentStatusQuery(merchantOid), cancellationToken));

    /// <summary>
    /// PayTR'nin ödeme sonucunu bildirdiği uç (PayTR panelinde "Bildirim URL" olarak tanımlanır).
    /// Oturum gerektirmez; güvenlik imza doğrulamasıyla sağlanır. Yanıt düz metin "OK" olmalıdır.
    /// </summary>
    [HttpPost("callback")]
    [AllowAnonymous]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> Callback([FromForm] PayTrCallbackForm form, CancellationToken cancellationToken)
    {
        var accepted = await mediator.Send(new HandlePayTrCallbackCommand(
            form.merchant_oid ?? string.Empty, form.status ?? string.Empty, form.total_amount ?? string.Empty,
            form.hash ?? string.Empty, form.failed_reason_code, form.failed_reason_msg), cancellationToken);

        return accepted
            ? Content("OK", "text/plain")
            : Content("PAYTR notification failed: bad hash", "text/plain");
    }

    /// <summary>
    /// PayTR müşteriyi ödeme sonrası buraya POST ile döndürür; biz de uygulamadaki sayfaya
    /// yönlendiririz (frontend statik barındırıldığı için POST kabul edemez).
    /// </summary>
    [AcceptVerbs("GET", "POST")]
    [Route("return/{merchantOid}")]
    [AllowAnonymous]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Return(string merchantOid, [FromQuery] string? result, CancellationToken cancellationToken)
    {
        var path = await mediator.Send(new GetCardPaymentReturnUrlQuery(merchantOid, result == "ok"), cancellationToken);
        var target = settings.Value.AppBaseUrl.TrimEnd('/') + path;

        // PayTR'nin ödeme sayfası uygulamamızın içinde (iframe) açılır; dönüş de o çerçevede
        // yüklenir. Bu küçük sayfa ANA pencereyi uygulamaya yönlendirir. Hedef adres yalnızca
        // yapılandırılmış uygulama adresi + kayıtlı uygulama içi yoldur (açık yönlendirme yok).
        var encoded = System.Text.Encodings.Web.JavaScriptEncoder.Default.Encode(target);
        var html = $$"""
            <!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Yönlendiriliyor</title></head>
            <body style="font-family:sans-serif;text-align:center;padding-top:40px">
            <p>Ödeme sayfasından dönülüyor...</p>
            <script>var t="{{encoded}}";try{window.top.location.href=t;}catch(e){window.location.href=t;}</script>
            <noscript><a href="{{System.Net.WebUtility.HtmlEncode(target)}}">Devam etmek için tıklayın</a></noscript>
            </body></html>
            """;
        return Content(html, "text/html; charset=utf-8");
    }

    private string ClientIp()
    {
        var ip = HttpContext.Connection.RemoteIpAddress;
        if (ip is null) return "0.0.0.0";
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        return ip.ToString();
    }

    private string BackendBaseUrl() => $"{Request.Scheme}://{Request.Host}";
}

public sealed record PayTrStatusResponse(bool Available, bool TestMode);

/// <param name="AmountMinor">İade tutarı (kuruş). Boşsa kalan tutarın tamamı.</param>
public sealed record RefundCardPaymentRequest(long? AmountMinor, string? Reason);

/// <summary>Ödeme yapanın iletişim bilgileri: PayTR'ye iletilir, saklanmaz.</summary>
public abstract record PayTrBuyerRequest(string? Email, string? FullName, string? Address, string? Phone)
{
    public PayTrBuyer ToBuyer() => new(Email ?? string.Empty, FullName ?? string.Empty, Address ?? string.Empty, Phone ?? string.Empty);
}

public sealed record StartTablePaymentRequest(
    string BillId, IReadOnlyCollection<string>? ItemIds, long? Amount, string? ReturnPath,
    string? Email, string? FullName, string? Address, string? Phone) : PayTrBuyerRequest(Email, FullName, Address, Phone);

public sealed record StartSubscriptionPaymentRequest(
    string RestaurantId, SubscriptionPlan Plan, int BillingPeriodMonths, string? ReturnPath,
    string? Email, string? FullName, string? Address, string? Phone) : PayTrBuyerRequest(Email, FullName, Address, Phone);

/// <summary>PayTR'nin gönderdiği alan adları (snake_case) birebir.</summary>
#pragma warning disable IDE1006
public sealed class PayTrCallbackForm
{
    public string? merchant_oid { get; set; }
    public string? status { get; set; }
    public string? total_amount { get; set; }
    public string? hash { get; set; }
    public string? failed_reason_code { get; set; }
    public string? failed_reason_msg { get; set; }
    public string? test_mode { get; set; }
    public string? payment_type { get; set; }
}
#pragma warning restore IDE1006
