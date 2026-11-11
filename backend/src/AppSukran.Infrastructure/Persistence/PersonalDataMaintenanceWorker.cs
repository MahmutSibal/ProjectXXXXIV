using AppSukran.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AppSukran.Infrastructure.Persistence;

/// <summary>
/// KVKK "amaçla sınırlı ve gerektiği kadar saklama" ilkesi: amacı biten kişisel veriler
/// periyodik olarak silinir. Süreler (DEPLOYMENT.md "Kişisel veriler" bölümüyle aynı):
///
///   Telefon/e-posta doğrulama kayıtları ........ 30 gün (kayıt 15 dk içinde tamamlanır)
///   Süresi dolmuş / kapatılmış oturum kayıtları  30 gün
///   İade talebindeki IBAN ve hesap sahibi adı ... talep kapandıktan 90 gün sonra
///
/// Ayrıca eski, şifrelenmemiş T.C. kimlik numaralarını şifreler (PersonalDataProtection).
/// Fatura, ödeme ve sipariş kayıtları burada SİLİNMEZ: Vergi Usul Kanunu gereği saklanır.
/// </summary>
public sealed class PersonalDataMaintenanceWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<PersonalDataMaintenanceWorker> logger) : BackgroundService
{
    public static readonly TimeSpan VerificationRetention = TimeSpan.FromDays(30);
    public static readonly TimeSpan SessionRetention = TimeSpan.FromDays(30);
    public static readonly TimeSpan RefundBankDetailsRetention = TimeSpan.FromDays(90);

    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Uygulama açılışında migration'ın bitmesini bekle.
        try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(exception, "Kişisel veri bakımı başarısız oldu.");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    internal async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppSukranDbContext>();

        await using var sweepLock = await SqlApplicationLock.TryAcquireAsync(context, "AppSukran.PersonalDataMaintenance", cancellationToken);
        if (sweepLock is null)
        {
            return;
        }

        var now = DateTime.UtcNow;

        var verificationCutoff = now - VerificationRetention;
        var verifications = await context.Set<Domain.Entities.PhoneVerification>()
            .Where(v => v.CreatedAt < verificationCutoff)
            .ExecuteDeleteAsync(cancellationToken);

        var sessionCutoff = now - SessionRetention;
        var sessions = await context.Set<Domain.Entities.RefreshToken>()
            .Where(t => t.ExpiresAt < sessionCutoff || (t.RevokedAt != null && t.RevokedAt < sessionCutoff))
            .ExecuteDeleteAsync(cancellationToken);

        var refundCutoff = now - RefundBankDetailsRetention;
        var refunds = await context.Set<Domain.Entities.RefundRequest>()
            .Where(r => r.Status != RefundRequestStatus.Pending && r.ResolvedAt != null && r.ResolvedAt < refundCutoff
                && (r.Iban != null || r.AccountHolderName != null))
            .ExecuteUpdateAsync(set => set
                .SetProperty(r => r.Iban, (string?)null)
                .SetProperty(r => r.AccountHolderName, (string?)null), cancellationToken);

        var encrypted = await EncryptLegacyNationalIdsAsync(context, cancellationToken);

        if (verifications + sessions + refunds + encrypted > 0)
        {
            logger.LogInformation(
                "Kişisel veri bakımı: {Verifications} doğrulama, {Sessions} oturum silindi; {Refunds} iade IBAN'ı temizlendi; {Encrypted} kimlik no şifrelendi.",
                verifications, sessions, refunds, encrypted);
        }
    }

    /// <summary>Şifreleme eklenmeden önce kaydedilmiş, açık metin kimlik numaralarını şifreler.</summary>
    private static async Task<int> EncryptLegacyNationalIdsAsync(AppSukranDbContext context, CancellationToken cancellationToken)
    {
        if (PersonalDataProtection.Protector is null)
        {
            return 0;
        }

        // Ham değere bakmak gerekir; EF dönüştürücüsü okurken çözdüğü için SQL ile sayılır.
        var legacyIds = await context.Database
            .SqlQueryRaw<string>("SELECT [Id] AS [Value] FROM [BillingProfiles] WHERE [NationalId] <> '' AND [NationalId] NOT LIKE 'v1:%'")
            .ToListAsync(cancellationToken);

        if (legacyIds.Count == 0)
        {
            return 0;
        }

        var profiles = await context.Set<Domain.Entities.BillingProfile>()
            .Where(p => legacyIds.Contains(p.Id))
            .ToListAsync(cancellationToken);

        foreach (var profile in profiles)
        {
            // Değer aynı olduğu için EF değişiklik görmez; elle "değişti" işaretlenir ve
            // dönüştürücü yazarken şifreler.
            context.Entry(profile).Property(p => p.NationalId).IsModified = true;
        }

        await context.SaveChangesAsync(cancellationToken);
        return profiles.Count;
    }
}
