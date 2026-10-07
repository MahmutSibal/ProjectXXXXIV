using AppSukran.Application.Common.Models;
using AppSukran.Application.Reviews.Commands;
using AppSukran.Application.Reviews.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ReviewsController(IMediator mediator) : ControllerBase
{
    /// <summary>Bir restorana ait tüm yorumlar (en yeni önce). Anonim okunabilir.</summary>
    [HttpGet("restaurant/{restaurantId}")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyCollection<ReviewResponse>>> GetByRestaurant(string restaurantId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetReviewsByRestaurantQuery(restaurantId), cancellationToken));

    /// <summary>Oturum açan kullanıcının kendi yorumları.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<IReadOnlyCollection<ReviewResponse>>> GetMine(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetMyReviewsQuery(), cancellationToken));

    [HttpPost]
    public async Task<ActionResult<ReviewResponse>> Create([FromBody] CreateReviewRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new CreateReviewCommand(request.RestaurantId, request.Comment, request.Rating), cancellationToken));

    /// <summary>Yoruma beğeni/beğenmeme. Aynı tepki tekrar gönderilirse geri alınır.</summary>
    [HttpPost("{reviewId}/react")]
    public async Task<ActionResult<ReviewResponse>> React(string reviewId, [FromBody] ReactToReviewRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ReactToReviewCommand(reviewId, request.IsLike), cancellationToken));

    [HttpDelete("{reviewId}")]
    public async Task<IActionResult> Delete(string reviewId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteReviewCommand(reviewId), cancellationToken);
        return NoContent();
    }

    /// <summary>Bir yoruma yanıt ekler (@ ile kişi etiketlenebilir).</summary>
    [HttpPost("{reviewId}/replies")]
    public async Task<ActionResult<ReviewResponse>> AddReply(string reviewId, [FromBody] AddReplyRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new AddReplyCommand(reviewId, request.Comment, request.MentionedUserName), cancellationToken));

    [HttpDelete("{reviewId}/replies/{replyId}")]
    public async Task<IActionResult> DeleteReply(string reviewId, string replyId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteReplyCommand(reviewId, replyId), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateReviewRequest(string RestaurantId, string Comment, int Rating);
public sealed record ReactToReviewRequest(bool IsLike);
public sealed record AddReplyRequest(string Comment, string? MentionedUserName);
