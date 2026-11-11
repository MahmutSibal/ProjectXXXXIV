namespace AppSukran.Infrastructure.Settings;

/// <summary>
/// SMTP ayarları (ör. Brevo: smtp-relay.brevo.com:587). Parola depoya YAZILMAZ;
/// production'da SUKRAN_SMTP_PASSWORD ortam değişkeninden okunur.
/// </summary>
public sealed class EmailSettings
{
    public bool Enabled { get; set; }

    public string Host { get; set; } = string.Empty;

    public int Port { get; set; } = 587;

    /// <summary>587'de STARTTLS. Kapatmayın: parola ağda açık gider.</summary>
    public bool EnableSsl { get; set; } = true;

    public string Username { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    /// <summary>Gönderen adres. Brevo'da "doğrulanmış gönderici" olmalı, yoksa e-posta reddedilir.</summary>
    public string FromAddress { get; set; } = string.Empty;

    public string FromName { get; set; } = "Şükran App";

    /// <summary>İletişim formu gibi platform bildirimlerinin gideceği adres. Boşsa gönderici adres kullanılır.</summary>
    public string NotificationAddress { get; set; } = string.Empty;

    /// <summary>E-postalardaki bağlantılar için uygulamanın adresi (ör. https://sukranapp.runasp.net).</summary>
    public string AppBaseUrl { get; set; } = "http://localhost:5173";

    /// <summary>
    /// E-posta kodu WhatsApp'tan daha uzun yaşar: e-postalar birkaç dakika gecikebilir
    /// veya önce spam klasörüne düşebilir.
    /// </summary>
    public int CodeLifetimeSeconds { get; set; } = 600;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Host)
        && !string.IsNullOrWhiteSpace(Username)
        && !string.IsNullOrWhiteSpace(Password)
        && !string.IsNullOrWhiteSpace(FromAddress);
}
