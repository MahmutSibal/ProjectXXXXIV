using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.PaymentSetup.Commands;

/// <summary>
/// SuperAdmin: ödeme altyapısı anahtarları. Banka alanlarına asla dokunmaz;
/// satır yoksa boş banka alanları ve kapalı Havale/EFT ile oluşturur.
/// </summary>
public sealed record UpdatePaymentOptionsCommand(bool ShowIyzicoLogos, bool CardPaymentsEnabled) : IRequest<Unit>;

public sealed class UpdatePaymentOptionsCommandHandler(
    IUnitOfWork unitOfWork,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService)
    : IRequestHandler<UpdatePaymentOptionsCommand, Unit>
{
    public async Task<Unit> Handle(UpdatePaymentOptionsCommand request, CancellationToken cancellationToken)
    {
        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            throw new UnauthorizedAccessException("Bu işlem yalnızca platform yöneticisine açıktır.");
        }

        var repository = unitOfWork.Repository<PlatformPaymentSettings>();
        var existing = await repository.GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);
        var settings = existing ?? new PlatformPaymentSettings { BankTransferEnabled = false };

        settings.ShowIyzicoLogos = request.ShowIyzicoLogos;
        settings.CardPaymentsEnabled = request.CardPaymentsEnabled;
        settings.UpdatedAt = DateTime.UtcNow;

        if (existing is null)
        {
            await repository.InsertAsync(settings, cancellationToken);
        }
        else
        {
            await repository.ReplaceAsync(settings, cancellationToken);
        }

        await auditLogService.RecordAsync(
            "PlatformPaymentOptionsUpdated", nameof(PlatformPaymentSettings), settings.Id,
            $"Ödeme altyapısı ayarları güncellendi. iyzico logoları: {(request.ShowIyzicoLogos ? "gösteriliyor" : "gizli")}, online kart ödemesi: {(request.CardPaymentsEnabled ? "açık" : "kapalı")}",
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}
