using MediatR;

namespace AppSukran.Application.Reviews.Commands;

public sealed record DeleteReviewCommand(string ReviewId) : IRequest;
