using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Reviews.Commands;

public sealed class DeleteReviewCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<DeleteReviewCommand>
{
    public async Task Handle(DeleteReviewCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");

        var repository = unitOfWork.Repository<Review>();
        var review = await repository.GetByIdAsync(request.ReviewId, cancellationToken)
            ?? throw new InvalidOperationException("Yorum bulunamadı.");

        // Sadece kendi yorumunu silebilir (SuperAdmin moderasyonu ayrı ele alınır).
        if (review.UserId != userId)
        {
            throw new InvalidOperationException("Bu yorumu silme yetkiniz yok.");
        }

        await repository.DeleteAsync(review.Id, cancellationToken);
    }
}
