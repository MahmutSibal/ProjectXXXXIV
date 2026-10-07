using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Reviews.Queries;

public sealed record GetReviewsByRestaurantQuery(string RestaurantId)
    : IRequest<IReadOnlyCollection<ReviewResponse>>;
