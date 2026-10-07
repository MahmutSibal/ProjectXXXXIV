using MediatR;

namespace AppSukran.Application.Payments.Commands;

public sealed record PaySpecificItemsCommand(string BillId, IReadOnlyCollection<string> ItemIds, string PaidByUserId, string? CustomerCardId = null, string? CardNumber = null, string? Cvc = null) : IRequest<PaymentResultDto>;

public sealed record PaymentResultDto(string BillId, long PaidAmount, long RemainingAmount, string Status, string? TransactionId = null, string? Provider = null);