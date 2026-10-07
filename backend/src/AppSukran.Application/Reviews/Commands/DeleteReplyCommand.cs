using MediatR;

namespace AppSukran.Application.Reviews.Commands;

public sealed record DeleteReplyCommand(string ReviewId, string ReplyId) : IRequest;
