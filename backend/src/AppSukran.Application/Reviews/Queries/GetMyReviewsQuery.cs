using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Reviews.Queries;

public sealed record GetMyReviewsQuery() : IRequest<IReadOnlyCollection<ReviewResponse>>;
