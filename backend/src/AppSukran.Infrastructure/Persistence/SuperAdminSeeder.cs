using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;

namespace AppSukran.Infrastructure.Persistence;

public sealed class SuperAdminSeeder(IServiceScopeFactory scopeFactory, IOptions<SuperAdminSettings> options) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(settings.Email) || string.IsNullOrWhiteSpace(settings.Password))
        {
            return;
        }

        using var scope = scopeFactory.CreateScope();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var context = scope.ServiceProvider.GetRequiredService<AppSukranDbContext>();
        var passwordHashingService = scope.ServiceProvider.GetRequiredService<IPasswordHashingService>();

        var normalizedEmail = settings.Email.Trim().ToLowerInvariant();
        var existing = await context.Users.SingleOrDefaultAsync(user => user.Email == normalizedEmail, cancellationToken);

        if (existing is not null)
        {
            // Süper admin zaten var: ayarlardaki parola/rol ile uyumlu olduğundan emin ol.
            // Böylece SuperAdmin parolasını appsettings üzerinden güncelleyip yeniden
            // başlatmak yeterli olur (aksi halde ilk seed parolası kalıcı olur ve
            // doğru rol verilmemişse panel uçları 403 döndürür).
            var passwordMatches = passwordHashingService.VerifyPassword(settings.Password, existing.PasswordHash);
            var needsUpdate = !passwordMatches || existing.Role != settings.Role || !existing.IsActive;
            if (needsUpdate)
            {
                existing.PasswordHash = passwordHashingService.HashPassword(settings.Password);
                existing.Role = settings.Role;
                existing.IsActive = true;
                await unitOfWork.Repository<User>().ReplaceAsync(existing, cancellationToken);
            }

            return;
        }

        var user = new User
        {
            Name = string.IsNullOrWhiteSpace(settings.Name) ? "Super Admin" : settings.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHashingService.HashPassword(settings.Password),
            Role = settings.Role,
            IsActive = true
        };

        await unitOfWork.Repository<User>().InsertAsync(user, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}