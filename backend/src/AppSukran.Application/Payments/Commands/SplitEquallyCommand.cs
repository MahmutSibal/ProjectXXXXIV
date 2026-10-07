using MediatR;

namespace AppSukran.Application.Payments.Commands;

public sealed record SplitEquallyCommand(string BillId, int PersonCount, string PaidByUserId, string? CustomerCardId = null, string? CardNumber = null, string? Cvc = null) : IRequest<PaymentResultDto>;