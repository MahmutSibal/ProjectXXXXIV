using MediatR;

namespace AppSukran.Application.PhoneVerification.Commands;

/// <param name="VerificationTicket">
/// Kaydı tamamlarken gönderilecek tek kullanımlık jeton. "Bu numarayı doğruladım"
/// iddiasının sunucu tarafındaki kanıtıdır.
/// </param>
public sealed record VerifyPhoneCodeResult(string VerificationTicket, int TicketExpiresInSeconds);

public sealed record VerifyPhoneCodeCommand(string Phone, string Code) : IRequest<VerifyPhoneCodeResult>;
