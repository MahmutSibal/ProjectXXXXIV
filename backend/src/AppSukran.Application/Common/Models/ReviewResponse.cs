namespace AppSukran.Application.Common.Models;

public sealed record ReviewResponse(
    string Id,
    string RestaurantId,
    string UserId,
    string UserName,
    string Comment,
    int Rating,
    int LikeCount,
    int DislikeCount,
    string? MyReaction, // "like" | "dislike" | null
    bool IsMine,
    DateTime CreatedAt,
    IReadOnlyList<ReviewReplyResponse> Replies);

public sealed record ReviewReplyResponse(
    string Id,
    string UserId,
    string UserName,
    string? MentionedUserName,
    string Comment,
    bool IsMine,
    DateTime CreatedAt);
