using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Reviews.Commands;

/// <summary>Bir yoruma beğeni/beğenmeme verir. Aynı tepki tekrar gönderilirse geri alınır (toggle).</summary>
public sealed record ReactToReviewCommand(
    string ReviewId,
    bool IsLike) : IRequest<ReviewResponse>;
