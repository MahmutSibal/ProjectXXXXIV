using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Reviews.Commands;

public sealed class DeleteReplyCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<DeleteReplyCommand>
{
    public async Task Handle(DeleteReplyCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");

        var repository = unitOfWork.Repository<Review>();
        var review = await repository.GetByIdAsync(request.ReviewId, cancellationToken)
            ?? throw new InvalidOperationException("Yorum bulunamadı.");

        var reply = review.Replies.FirstOrDefault(r => r.Id == request.ReplyId)
            ?? throw new InvalidOperationException("Yanıt bulunamadı.");

        // Sadece kendi yanıtını silebilir.
        if (reply.UserId != userId)
        {
            throw new InvalidOperationException("Bu yanıtı silme yetkiniz yok.");
        }

        review.Replies.Remove(reply);
        await repository.ReplaceAsync(review, cancellationToken);
    }
}
