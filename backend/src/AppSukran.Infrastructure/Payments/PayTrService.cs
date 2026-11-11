using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure.Payments;

/// <summary>
/// PayTR iFrame API ve Platform Transfer API. Kart formu ve 3D Secure PayTR'nin
/// sayfasındadır. İmza formülleri PayTR'nin resmî örnek kodlarıyla birebir aynıdır
/// (dev.paytr.com, Kasım 2026):
///   Ödeme:    HMACSHA256(merchant_id + user_ip + merchant_oid + email + payment_amount(kuruş)
///                        + user_basket(base64) + no_installment + max_installment + currency
///                        + test_mode + merchant_salt, key = merchant_key) → base64
///   Bildirim: HMACSHA256(merchant_oid + merchant_salt + status + total_amount, merchant_key)
///   Transfer: HMACSHA256(merchant_id + merchant_oid + trans_id + submerchant_amount
///                        + total_amount + transfer_name + transfer_iban + merchant_salt, merchant_key)
/// </summary>
public sealed class PayTrService(
    HttpClient httpClient,
    IOptions<PayTrSettings> options,
    ILogger<PayTrService> logger) : IPayTrService
{
    private string BaseUrl => Settings.ApiBaseUrl.TrimEnd('/');
    private string TokenUrl => $"{BaseUrl}/odeme/api/get-token";
    private string PaymentPageBaseUrl => $"{BaseUrl}/odeme/guvenli/";
    private string TransferUrl => $"{BaseUrl}/odeme/platform/transfer";

    private PayTrSettings Settings => options.Value;

    public bool IsConfigured => Settings.IsConfigured;

    public bool TestMode => Settings.TestMode;

    public decimal FoodVatPercent => Settings.FoodVatPercent;

    public bool TransfersEnabled => Settings.TransfersEnabled && Settings.IsConfigured;

    public decimal DefaultCommissionPercent => Settings.DefaultCommissionPercent;

    public async Task<PayTrIframeResult> CreatePaymentPageAsync(PayTrIframeRequest request, CancellationToken cancellationToken = default)
    {
        EnsureConfigured();
        var s = Settings;

        // iFrame API: tutar kuruş cinsinden tam sayı (34,56 TL -> 3456).
        var paymentAmount = request.AmountMinor.ToString(CultureInfo.InvariantCulture);
        const string noInstallment = "1";  // Taksit gösterilmez (tek çekim).
        const string maxInstallment = "0";
        const string currency = "TL";
        var testMode = s.TestMode ? "1" : "0";

        // Sepet: [["ürün adı", "birim fiyat", adet], ...] JSON'u, base64.
        var basketJson = JsonSerializer.Serialize(request.Basket
            .Select(line => new object[] { line.Name, FormatAmount(line.UnitPriceMinor), line.Quantity })
            .ToArray(), new JsonSerializerOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
        var userBasket = Convert.ToBase64String(Encoding.UTF8.GetBytes(basketJson));

        var token = Sign(string.Concat(
            s.MerchantId, request.UserIp, request.MerchantOid, request.Buyer.Email, paymentAmount,
            userBasket, noInstallment, maxInstallment, currency, testMode, s.MerchantSalt));

        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["merchant_id"] = s.MerchantId,
            ["user_ip"] = request.UserIp,
            ["merchant_oid"] = request.MerchantOid,
            ["email"] = request.Buyer.Email,
            ["payment_amount"] = paymentAmount,
            ["paytr_token"] = token,
            ["user_basket"] = userBasket,
            ["debug_on"] = s.DebugOn ? "1" : "0",
            ["no_installment"] = noInstallment,
            ["max_installment"] = maxInstallment,
            ["user_name"] = Truncate(request.Buyer.FullName, 60),
            ["user_address"] = Truncate(request.Buyer.Address, 400),
            ["user_phone"] = Truncate(request.Buyer.Phone, 20),
            ["merchant_ok_url"] = request.OkUrl,
            ["merchant_fail_url"] = request.FailUrl,
            ["timeout_limit"] = "30",
            ["currency"] = currency,
            ["test_mode"] = testMode,
            ["lang"] = "tr",
        });

        try
        {
            using var response = await httpClient.PostAsync(TokenUrl, content, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            using var json = JsonDocument.Parse(body);
            var root = json.RootElement;

            if (root.TryGetProperty("status", out var status) && status.GetString() == "success"
                && root.TryGetProperty("token", out var pageToken))
            {
                return new PayTrIframeResult(true, PaymentPageBaseUrl + pageToken.GetString(), null);
            }

            var reason = root.TryGetProperty("reason", out var r) ? r.GetString() : body;
            logger.LogWarning("[PayTR] Ödeme sayfası alınamadı {MerchantOid}: {Reason}", request.MerchantOid, reason);
            return new PayTrIframeResult(false, null, reason);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "[PayTR] Token isteği başarısız ({MerchantOid})", request.MerchantOid);
            return new PayTrIframeResult(false, null, "PayTR'ye ulaşılamadı.");
        }
    }

    private static string Truncate(string value, int max)
    {
        var trimmed = (value ?? string.Empty).Trim();
        return trimmed.Length <= max ? trimmed : trimmed[..max];
    }

    public bool VerifyCallback(string merchantOid, string status, string totalAmount, string hash)
    {
        if (!IsConfigured || string.IsNullOrEmpty(hash))
        {
            return false;
        }

        var expected = Sign(string.Concat(merchantOid, Settings.MerchantSalt, status, totalAmount));
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(expected), Encoding.ASCII.GetBytes(hash));
    }

    public async Task<PayTrTransferResult> RequestTransferAsync(PayTrTransferRequest request, CancellationToken cancellationToken = default)
    {
        EnsureConfigured();
        var s = Settings;

        var submerchantAmount = request.SubmerchantAmountMinor.ToString(CultureInfo.InvariantCulture);
        var totalAmount = request.TotalAmountMinor.ToString(CultureInfo.InvariantCulture);

        var token = Sign(string.Concat(
            s.MerchantId, request.MerchantOid, request.TransId, submerchantAmount, totalAmount,
            request.TransferName, request.TransferIban, s.MerchantSalt));

        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["merchant_id"] = s.MerchantId,
            ["merchant_oid"] = request.MerchantOid,
            ["trans_id"] = request.TransId,
            ["submerchant_amount"] = submerchantAmount,
            ["total_amount"] = totalAmount,
            ["transfer_name"] = request.TransferName,
            ["transfer_iban"] = request.TransferIban,
            ["paytr_token"] = token,
        });

        try
        {
            using var response = await httpClient.PostAsync(TransferUrl, content, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            using var json = JsonDocument.Parse(body);
            var root = json.RootElement;
            var status = root.TryGetProperty("status", out var st) ? st.GetString() : null;

            if (string.Equals(status, "success", StringComparison.OrdinalIgnoreCase))
            {
                var reference = root.TryGetProperty("reference", out var r) ? r.ToString() : null;
                return new PayTrTransferResult(true, reference, null, null);
            }

            var errNo = root.TryGetProperty("err_no", out var en) ? en.ToString() : null;
            var errMsg = root.TryGetProperty("err_msg", out var em) ? em.ToString() : body;
            return new PayTrTransferResult(false, null, errNo, errMsg);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "[PayTR] Transfer isteği başarısız ({MerchantOid})", request.MerchantOid);
            return new PayTrTransferResult(false, null, "network", "PayTR'ye ulaşılamadı.");
        }
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("Kartla ödeme şu anda kullanılamıyor.");
        }
    }

    private string Sign(string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(Settings.MerchantKey));
        return Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    /// <summary>12345 kuruş → "123.45"; 15000 → "150".</summary>
    internal static string FormatAmount(long minor)
    {
        var lira = minor / 100;
        var kurus = minor % 100;
        return kurus == 0
            ? lira.ToString(CultureInfo.InvariantCulture)
            : $"{lira.ToString(CultureInfo.InvariantCulture)}.{kurus:00}";
    }
}
