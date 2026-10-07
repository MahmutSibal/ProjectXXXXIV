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
}
