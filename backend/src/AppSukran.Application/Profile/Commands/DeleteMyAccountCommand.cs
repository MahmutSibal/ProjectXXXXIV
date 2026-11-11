using System.Security.Cryptography;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.Profile.Commands;

/// <summary>
/// "Hesabımı sil" (KVKK m.11: kişisel verilerin silinmesini isteme hakkı).
///
/// - Müşteri ve personel: hesap hemen ANONİMLEŞTİRİLİR. Ad, e-posta, telefon, adres
///   silinir; hesap kapatılır, oturumlar sonlanır; yorumlardaki isim "Silinmiş kullanıcı"
///   olur. Kayıt satırı kalır çünkü siparişler/denetim kayıtları ona bağlıdır, ama kişiyi
///   tanımlayan hiçbir bilgi kalmaz.
/// - İşletme sahibi: hesap hemen silinmez. Fatura ve ödeme kayıtlarının yasal saklama
///   süresi (VUK) olduğu ve işletmenin aboneliği/hakedişi kapatılması gerektiği için
///   Süper Admin'e "Hesap silme talebi" düşer.
/// </summary>
public sealed record DeleteMyAccountCommand(string Password) : IRequest<DeleteMyAccountResult>;

/// <param name="Deleted">true: hesap anonimleştirildi; false: talep Süper Admin'e iletildi.</param>
public sealed record DeleteMyAccountResult(bool Deleted, string Message);

public sealed class DeleteMyAccountCommandValidator : AbstractValidator<DeleteMyAccountCommand>
{
    public DeleteMyAccountCommandValidator()
    {
        RuleFor(x => x.Password).NotEmpty().WithMessage("Onay için şifrenizi girin.").MaximumLength(200);
    }
}

public sealed class DeleteMyAccountCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IPasswordHashingService passwordHashingService,
    IAuditLogService auditLogService) : IRequestHandler<DeleteMyAccountCommand, DeleteMyAccountResult>
{
    public const string DeletedName = "Silinmiş kullanıcı";

    public async Task<DeleteMyAccountResult> Handle(DeleteMyAccountCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");
        var users = unitOfWork.Repository<User>();
        var user = await users.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("Kullanıcı bulunamadı.");

        if (!passwordHashingService.VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new InvalidOperationException("Şifre hatalı.");
        }

        if (user.Role == UserRole.SuperAdmin)
        {
            throw new InvalidOperationException("Süper Admin hesabı bu yolla silinemez.");
        }

        if (user.Role == UserRole.RestaurantOwner)
        {
            var restaurant = user.RestaurantId is null
                ? null
                : await unitOfWork.Repository<Restaurant>().GetByIdAsync(user.RestaurantId, cancellationToken);

            await unitOfWork.Repository<SupportRequest>().InsertAsync(new SupportRequest
            {
                RestaurantId = user.RestaurantId,
                CreatedByUserId = user.Id,
                BusinessName = restaurant?.Name ?? "İşletme",
                Topic = "Hesap silme talebi",
                Content = "İşletme sahibi hesabının ve kişisel verilerinin silinmesini talep etti (KVKK m.11). " +
                          "Abonelik ve hakedişler kapatıldıktan sonra, yasal saklama süresi olan fatura/ödeme " +
                          "kayıtları dışındaki kişisel veriler silinmeli.",
                Phone = user.Phone ?? string.Empty,
                IsCalled = false,
            }, cancellationToken);

            await auditLogService.RecordAsync("AccountDeletionRequested", nameof(User), user.Id,
                "İşletme sahibi hesap silme talebi oluşturdu.", user.Id, cancellationToken);

            return new DeleteMyAccountResult(false,
                "Hesap silme talebiniz alındı. Aboneliğiniz ve hakedişleriniz kapatıldıktan sonra " +
                "kişisel verileriniz silinecek; ekibimiz sizinle iletişime geçecek.");
        }

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            // Kişiyi tanımlayan her şey silinir. E-posta benzersiz olmak zorunda olduğu için
            // kimliğe bağlı, gerçek olmayan bir adresle değiştirilir (aynı e-postayla yeniden
            // kayıt olunabilsin).
            user.Name = DeletedName;
            user.Email = $"silindi-{user.Id}@silinmis.invalid";
            user.Phone = null;
            user.Address = null;
            user.MarketingConsent = false;
            user.MarketingConsentAt = null;
            user.IsActive = false;
            user.PasswordHash = passwordHashingService.HashPassword(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
            await users.ReplaceAsync(user, cancellationToken);

            var tokens = unitOfWork.Repository<RefreshToken>();
            foreach (var token in await tokens.FindAsync(t => t.UserId == user.Id, cancellationToken))
            {
                await tokens.DeleteAsync(token.Id, cancellationToken);
            }

            await AnonymizeReviewsAsync(user.Id, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }

        await auditLogService.RecordAsync("AccountDeleted", nameof(User), user.Id,
            "Kullanıcı hesabını sildi (anonimleştirildi).", user.Id, cancellationToken);

        return new DeleteMyAccountResult(true, "Hesabınız ve kişisel bilgileriniz silindi.");
    }

    private async Task AnonymizeReviewsAsync(string userId, CancellationToken cancellationToken)
    {
        var reviews = unitOfWork.Repository<Review>();
        // Kendi yorumları ve başkalarının yorumlarına yazdığı yanıtlar.
        var all = await reviews.FindAsync(
            r => r.UserId == userId || r.Replies.Any(reply => reply.UserId == userId), cancellationToken);

        foreach (var review in all)
        {
            if (review.UserId == userId)
            {
                review.UserName = DeletedName;
            }

            foreach (var reply in review.Replies.Where(reply => reply.UserId == userId))
            {
                reply.UserName = DeletedName;
            }

            await reviews.ReplaceAsync(review, cancellationToken);
        }
    }
}
