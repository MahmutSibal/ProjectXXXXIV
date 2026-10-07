namespace AppSukran.Infrastructure.Settings;

/// <summary>
/// wppconnect servisi ayarları. Servis jetonu depoya YAZILMAZ:
/// geliştirmede user-secrets, production'da SUKRAN_WHATSAPP_TOKEN.
/// </summary>
public sealed class WhatsAppSettings
{
    public bool Enabled { get; set; }

    /// <summary>Node servisinin adresi. Yalnızca iç ağdan erişilebilir olmalıdır.</summary>
    public string BaseUrl { get; set; } = "http://127.0.0.1:5055";

    /// <summary>Servisle paylaşılan jeton (x-service-token başlığı).</summary>
    public string ServiceToken { get; set; } = string.Empty;

    /// <summary>Doğrulama kodunun geçerlilik süresi (saniye).</summary>
    public int CodeLifetimeSeconds { get; set; } = 180;

    /// <summary>Aynı numaraya yeni kod göndermeden önce beklenecek süre (saniye).</summary>
    public int ResendCooldownSeconds { get; set; } = 60;

    /// <summary>Kod doğrulandıktan sonra kaydı tamamlamak için tanınan süre (saniye).</summary>
    public int TicketLifetimeSeconds { get; set; } = 900;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ServiceToken);
}
