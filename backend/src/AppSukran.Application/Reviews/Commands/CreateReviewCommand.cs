using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Reviews.Commands;

public sealed record CreateReviewCommand(
    string RestaurantId,
    string Comment,
    int Rating) : IRequest<ReviewResponse>;
