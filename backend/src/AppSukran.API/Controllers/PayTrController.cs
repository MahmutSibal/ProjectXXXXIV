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
/// PayTR ile kartla ödeme. Kart bilgisi bu uçlara HİÇ gelmez: başlat uçları yalnızca
/// imzalı formu döner, tarayıcı kartı doğrudan PayTR'ye gönderir.
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
            request.BillId, request.ItemIds, request.Amount, request.Email, request.ReturnPath ?? "/",
            ClientIp(), BackendBaseUrl()), cancellationToken));

    /// <summary>İşletme sahibinin paket ödemesi.</summary>
    [HttpPost("subscription-payments")]
    [Authorize(Roles = "RestaurantOwner")]
    [EnableRateLimiting("payments-write")]
    public async Task<ActionResult<CardPaymentStartResult>> StartSubscriptionPayment(
        [FromBody] StartSubscriptionPaymentRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new StartSubscriptionCardPaymentCommand(
            request.RestaurantId, request.Plan, request.BillingPeriodMonths, request.Email,
            request.ReturnPath ?? "/admin/subscription", ClientIp(), BackendBaseUrl()), cancellationToken));

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
        // 303: tarayıcı POST'u GET'e çevirerek sayfaya gider.
        Response.Headers.Location = target;
        return StatusCode((int)HttpStatusCode.SeeOther);
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

public sealed record StartTablePaymentRequest(string BillId, IReadOnlyCollection<string>? ItemIds, long? Amount, string Email, string? ReturnPath);

public sealed record StartSubscriptionPaymentRequest(string RestaurantId, SubscriptionPlan Plan, int BillingPeriodMonths, string Email, string? ReturnPath);

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
