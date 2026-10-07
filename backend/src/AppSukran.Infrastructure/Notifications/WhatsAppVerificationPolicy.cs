using AppSukran.Application.PhoneVerification.Commands;
using AppSukran.Infrastructure.Settings;

namespace AppSukran.Infrastructure;

/// <summary>
/// Süre/limit ayarlarını Application katmanına köprüler; böylece handler'lar
/// Infrastructure'daki ayar sınıfına doğrudan bağımlı olmaz.
/// </summary>
public sealed class WhatsAppVerificationPolicy(WhatsAppSettings settings) : IPhoneVerificationPolicy
{
    public int CodeLifetimeSeconds => settings.CodeLifetimeSeconds;
    public int ResendCooldownSeconds => settings.ResendCooldownSeconds;
    public int TicketLifetimeSeconds => settings.TicketLifetimeSeconds;
}
