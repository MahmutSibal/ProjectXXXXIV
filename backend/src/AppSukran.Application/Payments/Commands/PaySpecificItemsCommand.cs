using MediatR;

namespace AppSukran.Application.Payments.Commands;

/// <summary>Personelin seçili kalemlerin masada (nakit / POS) ödendiğini işlemesi.</summary>
public sealed record PaySpecificItemsCommand(string BillId, IReadOnlyCollection<string> ItemIds, string PaidByUserId) : IRequest<PaymentResultDto>;
