using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.PaymentSetup.Commands;

/// <param name="BankTransferEnabled">
/// Havale/EFT açık/kapalı. Gönderilmezse (null) IBAN doluysa açık sayılır.
/// Kapalıyken kayıtlı banka bilgileri korunur; kapatırken tüm alanlar boş gelirse
/// mevcut bilgilere dokunulmaz. Alan gönderilmeden tümü boşsa bilgiler temizlenir (eski davranış).
/// </param>
public sealed record UpdatePlatformPaymentSettingsCommand(
    string? BankName,
    string? AccountHolder,
    string? Iban,
    string? Branch,
    string? PaymentNote,
    bool? BankTransferEnabled = null) : IRequest<Unit>;

public sealed class UpdatePlatformPaymentSettingsCommandHandler(
    IUnitOfWork unitOfWork,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService)
    : IRequestHandler<UpdatePlatformPaymentSettingsCommand, Unit>
{
    public async Task<Unit> Handle(UpdatePlatformPaymentSettingsCommand request, CancellationToken cancellationToken)
    {
        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            throw new UnauthorizedAccessException("Bu işlem yalnızca platform yöneticisine açıktır.");
        }

        var bankName = Limit(request.BankName, "Banka adı", 100);
        var accountHolder = Limit(request.AccountHolder, "Hesap sahibi", 150);
        var branch = Limit(request.Branch, "Şube", 100);
        var paymentNote = Limit(request.PaymentNote, "Açıklama", 500);
        var iban = TurkishIban.Normalize(request.Iban);

        if (iban.Length > 0)
        {
            if (!TurkishIban.IsValid(iban))
            {
                throw new InvalidOperationException("Geçerli bir IBAN girin (TR ile başlayan 26 karakter).");
            }

            if (bankName.Length == 0)
            {
                throw new InvalidOperationException("IBAN girildiğinde banka adı zorunludur.");
            }

            if (accountHolder.Length == 0)
            {
                throw new InvalidOperationException("IBAN girildiğinde hesap sahibi zorunludur.");
            }
        }

        var enabled = request.BankTransferEnabled ?? (iban.Length > 0);
        if (enabled && iban.Length == 0)
        {
            throw new InvalidOperationException("Havale/EFT'yi açmak için banka bilgilerini girin.");
        }

        var repository = unitOfWork.Repository<PlatformPaymentSettings>();
        var existing = await repository.GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);
        var settings = existing ?? new PlatformPaymentSettings();

        // Kapatırken yalnızca anahtar gönderildiyse (tüm alanlar boş) kayıtlı bilgiler korunur.
        var keepStoredDetails = existing is not null
            && request.BankTransferEnabled == false
            && bankName.Length == 0 && accountHolder.Length == 0 && iban.Length == 0
            && branch.Length == 0 && paymentNote.Length == 0;

        if (keepStoredDetails)
        {
            bankName = settings.BankName;
            iban = settings.Iban;
        }
        else
        {
            settings.BankName = bankName;
            settings.AccountHolder = accountHolder;
            settings.Iban = iban;
            settings.Branch = branch;
            settings.PaymentNote = paymentNote;
        }

        settings.BankTransferEnabled = enabled;
        settings.UpdatedAt = DateTime.UtcNow;

        if (existing is null)
        {
            await repository.InsertAsync(settings, cancellationToken);
        }
        else
        {
            await repository.ReplaceAsync(settings, cancellationToken);
        }

        // Denetim kaydına IBAN yalnızca maskeli yazılır.
        await auditLogService.RecordAsync(
            "PlatformPaymentSettingsUpdated", nameof(PlatformPaymentSettings), settings.Id,
            $"Havale/EFT {(enabled ? "açıldı" : "kapatıldı")}, bilgiler güncellendi. Banka:{(bankName.Length == 0 ? "-" : bankName)}, IBAN: {TurkishIban.Mask(iban)}",
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }

    private static string Limit(string? value, string fieldName, int maxLength)
    {
        var trimmed = (value ?? string.Empty).Trim();
        if (trimmed.Length > maxLength)
        {
            throw new InvalidOperationException($"{fieldName} en fazla {maxLength} karakter olabilir.");
        }

        return trimmed;
    }
}
