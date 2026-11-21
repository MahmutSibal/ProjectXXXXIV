using AppSukran.Application.Abstractions.Security;
using Microsoft.Extensions.Caching.Memory;

namespace AppSukran.Infrastructure.Security;

/// <summary>
/// Bellek içi şifre deneme sayacı: 15 dakikada 5 hatalı denemeden sonra 5 dakika bekletir.
/// Doğru şifreyle giriş sayacı sıfırlar. Uygulama tek sunucuda çalıştığı için bellek yeterli.
/// </summary>
public sealed class LoginAttemptGuard(IMemoryCache cache) : ILoginAttemptGuard
{
    public const int MaxFailures = 5;
    public static readonly TimeSpan FailureWindow = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(5);

    private sealed class Entry
    {
        public int Failures;
        public DateTimeOffset? LockedUntil;
    }

    private readonly object gate = new();

    private static string Key(string email, string? ipAddress)
        => $"login-attempts:{email.Trim().ToLowerInvariant()}|{ipAddress ?? "bilinmeyen"}";

    public TimeSpan? GetRemainingLockout(string email, string? ipAddress)
    {
        lock (gate)
        {
            if (!cache.TryGetValue(Key(email, ipAddress), out Entry? entry) || entry?.LockedUntil is null)
            {
                return null;
            }

            var remaining = entry.LockedUntil.Value - DateTimeOffset.UtcNow;
            return remaining > TimeSpan.Zero ? remaining : null;
        }
    }

    public void RegisterFailure(string email, string? ipAddress)
    {
        var key = Key(email, ipAddress);
        lock (gate)
        {
            var entry = cache.Get<Entry>(key);
            if (entry is null || (entry.LockedUntil is { } until && until <= DateTimeOffset.UtcNow))
            {
                entry = new Entry();
            }

            entry.Failures++;
            if (entry.Failures >= MaxFailures)
            {
                entry.LockedUntil = DateTimeOffset.UtcNow.Add(LockoutDuration);
                entry.Failures = 0;
            }

            cache.Set(key, entry, FailureWindow);
        }
    }

    public void Reset(string email, string? ipAddress)
    {
        lock (gate)
        {
            cache.Remove(Key(email, ipAddress));
        }
    }
}
