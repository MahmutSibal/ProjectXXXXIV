using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;

namespace AppSukran.Application.Reviews;

internal static class ReviewMapping
{
    /// <summary>Bir Review belgesini, çağıran kullanıcının bakış açısıyla DTO'ya çevirir.</summary>
    public static ReviewResponse ToResponse(Review review, string? currentUserId)
    {
        var myReaction = review.Reactions.FirstOrDefault(r => r.UserId == currentUserId);
        var replies = review.Replies
            .OrderBy(reply => reply.CreatedAt)
            .Select(reply => new ReviewReplyResponse(
                reply.Id,
                reply.UserId,
                reply.UserName,
                reply.MentionedUserName,
                reply.Comment,
                reply.UserId == currentUserId,
                reply.CreatedAt))
            .ToList();

        return new ReviewResponse(
            review.Id,
            review.RestaurantId,
            review.UserId,
            review.UserName,
            review.Comment,
            review.Rating,
            review.Reactions.Count(r => r.IsLike),
            review.Reactions.Count(r => !r.IsLike),
            myReaction is null ? null : (myReaction.IsLike ? "like" : "dislike"),
            review.UserId == currentUserId,
            review.CreatedAt,
            replies);
    }
}
