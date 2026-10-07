using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Maintenance;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Maintenance.Commands;

/// <param name="MaintenanceEnabled">Bakım duyurusu açık mı?</param>
/// <param name="Message">Duyuru metni; kırpılır, en fazla 300 karakter.</param>
/// <param name="ServerDisabled">Yazılımsal sunucu kapatma. null (gönderilmedi) ise kayıtlı değer korunur.</param>
public sealed record UpdateMaintenanceSettingsCommand(
    bool MaintenanceEnabled,
    string? Message,
    bool? ServerDisabled = null) : IRequest<Unit>;

public sealed class UpdateMaintenanceSettingsCommandHandler(
    IUnitOfWork unitOfWork,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    IServerShutdownState serverShutdownState)
    : IRequestHandler<UpdateMaintenanceSettingsCommand, Unit>
{
    public const int MaxMessageLength = 300;

    public async Task<Unit> Handle(UpdateMaintenanceSettingsCommand request, CancellationToken cancellationToken)
    {
        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            throw new UnauthorizedAccessException("Bu işlem yalnızca platform yöneticisine açıktır.");
        }

        var message = (request.Message ?? string.Empty).Trim();
        if (message.Length > MaxMessageLength)
        {
            throw new InvalidOperationException($"Bakım mesajı en fazla {MaxMessageLength} karakter olabilir.");
        }

        var repository = unitOfWork.Repository<MaintenanceSettings>();
        var existing = await repository.GetByIdAsync(MaintenanceSettings.SingletonId, cancellationToken);
        var settings = existing ?? new MaintenanceSettings();

        var previousServerDisabled = settings.ServerDisabled;

        settings.IsEnabled = request.MaintenanceEnabled;
        settings.Message = message;
        // Eski ön yüz yalnızca { maintenanceEnabled, message } gönderir; alan yoksa değeri koru.
        settings.ServerDisabled = request.ServerDisabled ?? settings.ServerDisabled;
        settings.UpdatedAt = DateTime.UtcNow;

        try
        {
            if (existing is null)
            {
                await repository.InsertAsync(settings, cancellationToken);
            }
            else
            {
                await repository.ReplaceAsync(settings, cancellationToken);
            }
        }
        finally
        {
            // Kayıt başarısız olsa bile önbelleği düşür: bir sonraki istek gerçek değeri okusun.
            serverShutdownState.Invalidate();
        }

        if (settings.ServerDisabled != previousServerDisabled)
        {
            await auditLogService.RecordAsync(
                settings.ServerDisabled ? "ServerShutdownEnabled" : "ServerShutdownDisabled",
                nameof(MaintenanceSettings), settings.Id,
                settings.ServerDisabled ? "Sunucu kapatıldı." : "Sunucu açıldı.",
                currentUserService.UserId, cancellationToken);
        }

        var action = settings.IsEnabled ? "MaintenanceModeEnabled" : "MaintenanceModeDisabled";
        await auditLogService.RecordAsync(
            action, nameof(MaintenanceSettings), settings.Id,
            $"Bakım modu {(settings.IsEnabled ? "açıldı" : "kapatıldı")}. Mesaj: {(message.Length == 0 ? "-" : message)}",
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}
