using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure.Payments;

/// <summary>
/// iyzico (gerçek PSP) ödeme sağlayıcısı. iyzico hesabı geldiğinde:
///   1) appsettings: "Payment:Provider" = "Iyzico"
///   2) "Payment:Iyzico:ApiKey" / "SecretKey" / "BaseUrl" doldurulur
/// Kod değişikliği gerekmez. Kimlik bilgisi yoksa açık bir hata fırlatır;
/// asla sessizce "başarılı" dönmez.
///
/// Burada iyzico'nun dokümante ettiği IYZWSv2 (HMAC-SHA256) imzalama şeması ile
/// /payment/auth uç noktasına istek atılır. Canlıya almadan önce buyer/adres
/// alanlarının iyzico üye iş yeri gereksinimlerine göre doldurulması gerekir
/// (aşağıdaki TODO).
/// </summary>
public sealed class IyzicoPaymentGateway(
    HttpClient httpClient,
    IOptions<PaymentSettings> options,
    ICurrentUserService currentUserService,
    ILogger<IyzicoPaymentGateway> logger) : IPaymentGateway
{
    // İşletmeye özel (kendi üye iş yeri) kimlik bilgileri. Null ise bu örnek platformun
    // global hesabıdır ve davranışı değişmemiştir.
    private IyzicoSettings? _merchantSettings;

    public string Provider => "Iyzico";

    /// <summary>
    /// Aynı bağımlılıklarla, ancak verilen işletme kimlik bilgilerini kullanan yeni bir örnek üretir.
    /// Platformun global anahtarları bu örnekte ChargeAsync için kullanılmaz.
    /// </summary>
    public IyzicoPaymentGateway ForMerchant(string apiKey, string secretKey, string baseUrl)
    {
        var global = options.Value.Iyzico;
        var gateway = new IyzicoPaymentGateway(httpClient, options, currentUserService, logger)
        {
            _merchantSettings = new IyzicoSettings
            {
                ApiKey = apiKey,
                SecretKey = secretKey,
                BaseUrl = baseUrl,
                GuestEmailDomain = global.GuestEmailDomain,
                DefaultIdentityNumber = global.DefaultIdentityNumber,
            },
        };
        return gateway;
    }

    public async Task<ChargeResult> ChargeAsync(ChargeRequest request, CancellationToken cancellationToken = default)
    {
        if (request.UseRestaurantMerchant && _merchantSettings is null)
        {
            // İşletme hesabına tahsilat istenmişken platform anahtarlarıyla çekim yapılmaz.
            throw new InvalidOperationException("Bu işletme online kart ödemesi almıyor.");
        }

        var settings = _merchantSettings ?? options.Value.Iyzico;
        if (!settings.IsConfigured)
        {
            // Sağlayıcı "Iyzico" seçilmiş ama anahtarlar girilmemiş — sessiz geçmek yerine net hata.
            throw new InvalidOperationException(
                "iyzico sağlayıcısı seçili ancak yapılandırılmamış. " +
                "appsettings içinde Payment:Iyzico:ApiKey ve SecretKey değerlerini girin.");
        }

        const string uriPath = "/payment/auth";
        var price = (request.AmountMinor / 100m).ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);

        // Aşağıdaki alan seçimleri iyzico sandbox'ına karşı tek tek denenerek doğrulandı:
        //  - email: ".local" gibi geçersiz TLD'ler "email hatalı format" (errorCode 5) ile reddedilir.
        //  - itemType: "PHYSICAL" seçilirse iyzico shippingAddress zorunlu tutar (errorCode 5000).
        //    Restoran adisyonu kargolanmadığı için doğrusu "VIRTUAL".
        //  - paymentChannel: proje yalnızca web olduğu için "WEB" (eskiden "MOBILE" yazıyordu).
        var (buyerName, buyerSurname) = SplitName(request.Card.CardHolderName);
        var body = new
        {
            locale = "tr",
            conversationId = request.BillId,
            price,
            paidPrice = price,
            currency = options.Value.Currency,
            installment = 1,
            paymentChannel = "WEB",
            paymentGroup = "PRODUCT",
            paymentCard = new
            {
                cardHolderName = request.Card.CardHolderName,
                cardNumber = new string(request.Card.CardNumber.Where(char.IsDigit).ToArray()),
                expireMonth = request.Card.ExpiryMonth.ToString("00"),
                expireYear = request.Card.ExpiryYear.ToString(),
                cvc = request.Card.Cvc ?? string.Empty,
                registerCard = 0,
            },
            buyer = new
            {
                id = request.PaidByUserId,
                name = buyerName,
                surname = buyerSurname,
                identityNumber = options.Value.Iyzico.DefaultIdentityNumber,
                email = ResolveBuyerEmail(request.PaidByUserId),
                registrationAddress = "Masa " + request.TableNo,
                city = "Istanbul",
                country = "Turkey",
                ip = ResolveBuyerIp(),
            },
            billingAddress = new
            {
                contactName = request.Card.CardHolderName,
                city = "Istanbul",
                country = "Turkey",
                address = "Masa " + request.TableNo,
            },
            basketItems = new[]
            {
                new
                {
                    id = request.BillId,
                    name = "Adisyon",
                    category1 = "Restoran",
                    itemType = "VIRTUAL",
                    price,
                },
            },
        };

        var json = JsonSerializer.Serialize(body);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, settings.BaseUrl.TrimEnd('/') + uriPath)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
        AddIyziAuthHeaders(httpRequest, settings, uriPath, json);

        try
        {
            using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;
            var status = root.TryGetProperty("status", out var s) ? s.GetString() : null;

            if (response.IsSuccessStatusCode && string.Equals(status, "success", StringComparison.OrdinalIgnoreCase))
            {
                var paymentId = root.TryGetProperty("paymentId", out var p) ? p.GetString() : null;
                return ChargeResult.Ok(paymentId ?? request.BillId, Provider);
            }

            var errorCode = root.TryGetProperty("errorCode", out var ec) ? ec.GetString() : "iyzico_error";
            var errorMessage = root.TryGetProperty("errorMessage", out var em) ? em.GetString() : "iyzico ödemesi reddedildi.";
            logger.LogWarning("[Iyzico] Charge failed bill={BillId} code={Code} msg={Msg}", request.BillId, errorCode, errorMessage);
            return ChargeResult.Fail(errorCode ?? "iyzico_error", errorMessage ?? "iyzico ödemesi reddedildi.", Provider);
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            logger.LogError(ex, "[Iyzico] Charge request error bill={BillId}", request.BillId);
            return ChargeResult.Fail("iyzico_network_error", "iyzico'ya ulaşılamadı: " + ex.Message, Provider);
        }
    }

    /// <summary>
    /// Alıcı e-postası. Oturumda e-posta varsa (personel/işletme sahibi) o kullanılır.
    /// QR ile masadan ödeyen misafirin e-postası yoktur; iyzico bu alanı zorunlu tuttuğu
    /// ve geçersiz formatı reddettiği için kendi alan adımızda geçerli formatta bir
    /// vekil adres üretilir.
    /// </summary>
    private string ResolveBuyerEmail(string paidByUserId)
    {
        var email = currentUserService.Email;
        if (!string.IsNullOrWhiteSpace(email) && email.Contains('@'))
        {
            return email;
        }

        // Sentetik QR kimliği "qr:{restaurantId}:{tableNo}:{sessionId}" biçimindedir;
        // ':' e-posta yerel kısmında geçerli değil, sadeleştiriyoruz.
        var localPart = new string(paidByUserId.Where(char.IsLetterOrDigit).ToArray());
        if (localPart.Length == 0)
        {
            localPart = "misafir";
        }

        // QR kimliği iki GUID içerdiği için sadeleştirilmiş hâli 67 karakter olabiliyor;
        // RFC 5321 yerel kısmı 64 ile sınırlar ve iyzico bunu "email hatalı format"
        // diyerek reddeder. Sondan kırpmak yerine baştan alıyoruz: restoran + masa
        // bilgisi başta olduğu için kırpılmış hâli de ayırt edici kalır.
        const int MaxLocalPartLength = 48;
        if (localPart.Length > MaxLocalPartLength)
        {
            localPart = localPart[..MaxLocalPartLength];
        }

        return $"{localPart}@{options.Value.Iyzico.GuestEmailDomain}";
    }

    /// <summary>
    /// İstemci IP'si. iyzico dolandırıcılık denetimi için gerçek IP bekler;
    /// alınamadığında (arka plan işi vb.) döngüsel adrese düşülür.
    /// </summary>
    private string ResolveBuyerIp()
    {
        var ip = currentUserService.IpAddress;
        if (string.IsNullOrWhiteSpace(ip))
        {
            return "127.0.0.1";
        }

        // Yerel geliştirmede IPv6 döngüsel adres gelir; iyzico IPv4 bekler.
        return ip is "::1" ? "127.0.0.1" : ip;
    }

    /// <summary>
    /// Kart üzerindeki tek alanı ad/soyad olarak ayırır. iyzico ikisini ayrı ister;
    /// eskiden tam ad her iki alana da yazılıyordu.
    /// </summary>
    private static (string Name, string Surname) SplitName(string cardHolderName)
    {
        var trimmed = (cardHolderName ?? string.Empty).Trim();
        if (trimmed.Length == 0)
        {
            return ("Musteri", "Musteri");
        }

        var lastSpace = trimmed.LastIndexOf(' ');
        return lastSpace <= 0
            ? (trimmed, trimmed)
            : (trimmed[..lastSpace].Trim(), trimmed[(lastSpace + 1)..].Trim());
    }

    /// <summary>iyzico IYZWSv2 (HMAC-SHA256) yetkilendirme başlıklarını ekler.</summary>
    private static void AddIyziAuthHeaders(HttpRequestMessage httpRequest, IyzicoSettings settings, string uriPath, string requestBody)
    {
        var randomKey = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + Guid.NewGuid().ToString("N")[..8];
        var payload = randomKey + uriPath + requestBody;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(settings.SecretKey));
        var signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var signature = Convert.ToHexString(signatureBytes).ToLowerInvariant();

        var authorizationParams = $"apiKey:{settings.ApiKey}&randomKey:{randomKey}&signature:{signature}";
        var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(authorizationParams));

        httpRequest.Headers.TryAddWithoutValidation("Authorization", "IYZWSv2 " + encoded);
        httpRequest.Headers.TryAddWithoutValidation("x-iyzi-rnd", randomKey);
    }

    /// <summary>
    /// Kartı iyzico'da saklar, tahsilat yapmaz (/cardstorage/card).
    /// Dönen cardUserKey + cardToken ile sonradan kart numarası olmadan tahsilat yapılır.
    /// Böylece kart numarası bizim veritabanımıza hiç girmez.
    /// </summary>
    public async Task<StoredCardResult> StoreCardAsync(StoreCardRequest request, CancellationToken cancellationToken = default)
    {
        var settings = options.Value.Iyzico;
        EnsureConfigured(settings);

        const string uriPath = "/cardstorage/card";
        var body = new
        {
            locale = "tr",
            conversationId = request.ExternalId,
            email = request.Email,
            externalId = request.ExternalId,
            card = new
            {
                cardAlias = request.CardAlias ?? "Abonelik Kartı",
                cardHolderName = request.CardHolderName,
                cardNumber = new string(request.CardNumber.Where(char.IsDigit).ToArray()),
                expireMonth = request.ExpiryMonth.ToString("00"),
                expireYear = request.ExpiryYear.ToString(),
            },
        };

        var json = JsonSerializer.Serialize(body);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, settings.BaseUrl.TrimEnd('/') + uriPath)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
        AddIyziAuthHeaders(httpRequest, settings, uriPath, json);

        try
        {
            using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            using var document = JsonDocument.Parse(responseBody);
            var root = document.RootElement;

            var status = root.TryGetProperty("status", out var s) ? s.GetString() : null;
            if (!string.Equals(status, "success", StringComparison.OrdinalIgnoreCase))
            {
                var message = root.TryGetProperty("errorMessage", out var em)
                    ? em.GetString() : "Kart kaydedilemedi.";
                logger.LogWarning("[Iyzico] Kart saklama başarısız external={External} msg={Msg}", request.ExternalId, message);
                return StoredCardResult.Fail(message ?? "Kart kaydedilemedi.");
            }

            return StoredCardResult.Ok(
                root.GetProperty("cardUserKey").GetString()!,
                root.GetProperty("cardToken").GetString()!,
                root.TryGetProperty("lastFourDigits", out var last4) ? last4.GetString() : null,
                root.TryGetProperty("cardFamily", out var family) ? family.GetString() : null);
        }
        catch (Exception exception) when (exception is not InvalidOperationException)
        {
            logger.LogError(exception, "[Iyzico] Kart saklama isteği başarısız external={External}", request.ExternalId);
            return StoredCardResult.Fail("iyzico'ya ulaşılamadı: " + exception.Message);
        }
    }

    /// <summary>Saklı kartla tahsilat — kart numarası gönderilmez.</summary>
    public async Task<ChargeResult> ChargeStoredCardAsync(StoredCardChargeRequest request, CancellationToken cancellationToken = default)
    {
        var settings = options.Value.Iyzico;
        EnsureConfigured(settings);

        const string uriPath = "/payment/auth";
        var price = (request.AmountMinor / 100m).ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);
        var (buyerName, buyerSurname) = SplitName(request.BuyerName);

        var body = new
        {
            locale = "tr",
            conversationId = request.ReferenceId,
            price,
            paidPrice = price,
            currency = options.Value.Currency,
            installment = 1,
            paymentChannel = "WEB",
            paymentGroup = "SUBSCRIPTION",
            paymentCard = new { cardUserKey = request.CardUserKey, cardToken = request.CardToken },
            buyer = new
            {
                id = request.BuyerId,
                name = buyerName,
                surname = buyerSurname,
                identityNumber = settings.DefaultIdentityNumber,
                email = request.BuyerEmail,
                registrationAddress = "Abonelik",
                city = "Istanbul",
                country = "Turkey",
                ip = ResolveBuyerIp(),
            },
            billingAddress = new
            {
                contactName = request.BuyerName,
                city = "Istanbul",
                country = "Turkey",
                address = "Abonelik",
            },
            basketItems = new[]
            {
                new { id = request.ReferenceId, name = request.Description, category1 = "Abonelik", itemType = "VIRTUAL", price },
            },
        };

        var json = JsonSerializer.Serialize(body);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, settings.BaseUrl.TrimEnd('/') + uriPath)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
        AddIyziAuthHeaders(httpRequest, settings, uriPath, json);

        try
        {
            using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            using var document = JsonDocument.Parse(responseBody);
            var root = document.RootElement;
            var status = root.TryGetProperty("status", out var s) ? s.GetString() : null;

            if (response.IsSuccessStatusCode && string.Equals(status, "success", StringComparison.OrdinalIgnoreCase))
            {
                var paymentId = root.TryGetProperty("paymentId", out var p) ? p.GetString() : null;
                return ChargeResult.Ok(paymentId ?? request.ReferenceId, Provider);
            }

            var errorCode = root.TryGetProperty("errorCode", out var ec) ? ec.GetString() : "iyzico_error";
            var errorMessage = root.TryGetProperty("errorMessage", out var em) ? em.GetString() : "Tahsilat reddedildi.";
            logger.LogWarning("[Iyzico] Saklı kart tahsilatı başarısız ref={Ref} code={Code} msg={Msg}",
                request.ReferenceId, errorCode, errorMessage);

            return ChargeResult.Fail(errorCode ?? "iyzico_error", errorMessage ?? "Tahsilat reddedildi.", Provider);
        }
        catch (Exception exception) when (exception is not InvalidOperationException)
        {
            logger.LogError(exception, "[Iyzico] Saklı kart tahsilat isteği başarısız ref={Ref}", request.ReferenceId);
            return ChargeResult.Fail("iyzico_network_error", "iyzico'ya ulaşılamadı: " + exception.Message, Provider);
        }
    }

    private static void EnsureConfigured(IyzicoSettings settings)
    {
        if (!settings.IsConfigured)
        {
            throw new InvalidOperationException(
                "iyzico sağlayıcısı seçili ancak yapılandırılmamış. " +
                "appsettings içinde Payment:Iyzico:ApiKey ve SecretKey değerlerini girin.");
        }
    }
}
