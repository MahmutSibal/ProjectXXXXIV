using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Reviews.Commands;

public sealed class ReactToReviewCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<ReactToReviewCommand, ReviewResponse>
{
    public async Task<ReviewResponse> Handle(ReactToReviewCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");

        var repository = unitOfWork.Repository<Review>();
        var review = await repository.GetByIdAsync(request.ReviewId, cancellationToken)
            ?? throw new InvalidOperationException("Yorum bulunamadı.");

        var existing = review.Reactions.FirstOrDefault(r => r.UserId == userId);
        if (existing is null)
        {
            // Yeni tepki ekle.
            review.Reactions.Add(new ReviewReaction { UserId = userId, IsLike = request.IsLike });
        }
        else if (existing.IsLike == request.IsLike)
        {
            // Aynı tepki tekrar → geri al (toggle off).
            review.Reactions.Remove(existing);
        }
        else
        {
            // Beğeni ↔ beğenmeme arasında geçiş.
            existing.IsLike = request.IsLike;
        }

        await repository.ReplaceAsync(review, cancellationToken);
        return ReviewMapping.ToResponse(review, userId);
    }
}
