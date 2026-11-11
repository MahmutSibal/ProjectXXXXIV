using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Reviews.Commands;

public sealed class CreateReviewCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<CreateReviewCommand, ReviewResponse>
{
    public async Task<ReviewResponse> Handle(CreateReviewCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");

        var comment = request.Comment?.Trim() ?? string.Empty;
        if (comment.Length < 3)
        {
            throw new InvalidOperationException("Yorum en az 3 karakter olmalı.");
        }
        if (comment.Length > 1000)
        {
            throw new InvalidOperationException("Yorum en fazla 1000 karakter olabilir.");
        }
        if (request.Rating < 1 || request.Rating > 5)
        {
            throw new InvalidOperationException("Puan 1 ile 5 arasında olmalı.");
        }
        if (string.IsNullOrWhiteSpace(request.RestaurantId))
        {
            throw new InvalidOperationException("Restoran bilgisi eksik.");
        }

        // İsim, listelemede ekstra sorgu gerekmesin diye yorumla birlikte saklanır.
        var user = await unitOfWork.Repository<User>().GetByIdAsync(userId, cancellationToken);
        var userName = user?.Name ?? currentUserService.Email ?? "Misafir";

        var restaurantId = request.RestaurantId.Trim();
        var repository = unitOfWork.Repository<Review>();

        await EnsureOrderedFromTableAsync(restaurantId, cancellationToken);

        // Tek yorum kuralı: kullanıcının bu restorana daha önce yaptığı yorum(lar) silinir,
        // yerine yeni yorum gelir (eski tepki ve yanıtlar da gider).
        var existing = await repository.FindAsync(
            r => r.RestaurantId == restaurantId && r.UserId == userId, cancellationToken);
        foreach (var old in existing)
        {
            await repository.DeleteAsync(old.Id, cancellationToken);
        }

        var review = new Review
        {
            RestaurantId = restaurantId,
            UserId = userId,
            UserName = userName,
            Comment = comment,
            Rating = request.Rating,
            Reactions = [],
            Replies = []
        };

        await repository.InsertAsync(review, cancellationToken);
        return ReviewMapping.ToResponse(review, userId);
    }

    /// <summary>
    /// Yorumu yalnızca restoranda gerçekten bulunmuş müşteri yazabilir: o restoranın
    /// masasındaki QR ile bağlanmış ve bu oturumda sipariş vermiş olmalı. Eskiden
    /// ücretsiz bir hesap açan herkes (ör. rakip işletme) hiç gitmediği restorana
    /// yorum yazabiliyordu.
    /// </summary>
    private async Task EnsureOrderedFromTableAsync(string restaurantId, CancellationToken cancellationToken)
    {
        const string NotAllowed = "Yorum yapabilmek için restoranda QR menüden sipariş vermiş olmanız gerekiyor.";

        var tableNo = currentUserService.TableNo;
        if (tableNo is null
            || !currentUserService.IsInRole(nameof(Domain.Enums.UserRole.Customer))
            || !string.Equals(currentUserService.RestaurantId, restaurantId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(NotAllowed);
        }

        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(restaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restoran bulunamadı.");
        var sessionStart = restaurant.Tables.FirstOrDefault(table => table.TableNo == tableNo)?.SessionOpenedAt
            ?? throw new InvalidOperationException(NotAllowed);

        // Masa oturumu açıldıktan sonra bu masadan verilmiş en az bir sipariş.
        var orders = await unitOfWork.Repository<Order>().FindAsync(
            order => order.RestaurantId == restaurantId && order.TableNo == tableNo && order.CreatedAt >= sessionStart,
            cancellationToken);

        if (orders.Count == 0)
        {
            throw new InvalidOperationException(NotAllowed);
        }
    }
}
