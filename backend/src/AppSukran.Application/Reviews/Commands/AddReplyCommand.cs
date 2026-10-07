using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Reviews.Commands;

/// <summary>Bir yoruma yanıt ekler; isteğe bağlı olarak bir kişiyi @ ile etiketler.</summary>
public sealed record AddReplyCommand(
    string ReviewId,
    string Comment,
    string? MentionedUserName) : IRequest<ReviewResponse>;
