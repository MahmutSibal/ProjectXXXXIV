using MediatR;

namespace AppSukran.Application.Payments.Commands;

public sealed record PayCustomAmountCommand(string BillId, long Amount, string PaidByUserId, string? CustomerCardId = null, string? CardNumber = null, string? Cvc = null) : IRequest<PaymentResultDto>;