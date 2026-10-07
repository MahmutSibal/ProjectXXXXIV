using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Reviews.Queries;

public sealed class GetReviewsByRestaurantQueryHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<GetReviewsByRestaurantQuery, IReadOnlyCollection<ReviewResponse>>
{
    public async Task<IReadOnlyCollection<ReviewResponse>> Handle(GetReviewsByRestaurantQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = currentUserService.UserId;
        var reviews = await unitOfWork.Repository<Review>()
            .FindAsync(review => review.RestaurantId == request.RestaurantId, cancellationToken);
        return reviews
            .OrderByDescending(review => review.CreatedAt)
            .Select(review => ReviewMapping.ToResponse(review, currentUserId))
            .ToList();
    }
}
