using MediatR;

namespace AppSukran.Application.Payments.Commands;

/// <summary>Personelin kalan tutarın eşit payının masada (nakit / POS) ödendiğini işlemesi.</summary>
public sealed record SplitEquallyCommand(string BillId, int PersonCount, string PaidByUserId) : IRequest<PaymentResultDto>;
