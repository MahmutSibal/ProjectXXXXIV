using MediatR;

namespace AppSukran.Application.Payments.Commands;

/// <summary>
/// Personelin masada alınan ödemeyi (nakit / restoranın kendi POS cihazı) sisteme işlemesi.
/// Kartla online ödeme bu yoldan YAPILMAZ: kart bilgisi sunucumuza hiç gelmez, PayTR
/// üzerinden alınır (bkz. CardPayments).
/// </summary>
public sealed record PayCustomAmountCommand(string BillId, long Amount, string PaidByUserId) : IRequest<PaymentResultDto>;

public sealed record PaymentResultDto(string BillId, long PaidAmount, long RemainingAmount, string Status, string? TransactionId = null, string? Provider = null);
