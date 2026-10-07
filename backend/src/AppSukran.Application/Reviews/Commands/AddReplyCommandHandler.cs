using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Reviews.Commands;

public sealed class AddReplyCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<AddReplyCommand, ReviewResponse>
{
    public async Task<ReviewResponse> Handle(AddReplyCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");

        var comment = request.Comment?.Trim() ?? string.Empty;
        if (comment.Length < 1)
        {
            throw new InvalidOperationException("Yanıt boş olamaz.");
        }
        if (comment.Length > 500)
        {
            throw new InvalidOperationException("Yanıt en fazla 500 karakter olabilir.");
        }

        var repository = unitOfWork.Repository<Review>();
        var review = await repository.GetByIdAsync(request.ReviewId, cancellationToken)
            ?? throw new InvalidOperationException("Yorum bulunamadı.");

        var user = await unitOfWork.Repository<User>().GetByIdAsync(userId, cancellationToken);
        var userName = user?.Name ?? currentUserService.Email ?? "Misafir";

        var mention = string.IsNullOrWhiteSpace(request.MentionedUserName) ? null : request.MentionedUserName.Trim();

        review.Replies.Add(new ReviewReply
        {
            UserId = userId,
            UserName = userName,
            MentionedUserName = mention,
            Comment = comment
        });

        await repository.ReplaceAsync(review, cancellationToken);
        return ReviewMapping.ToResponse(review, userId);
    }
}
