using MediatR;

namespace AppSukran.Application.PhoneVerification.Commands;

/// <param name="ExpiresInSeconds">Kodun geçerlilik süresi; arayüzdeki geri sayım bunu kullanır.</param>
public sealed record SendPhoneVerificationResult(string MaskedPhone, int ExpiresInSeconds, int ResendAfterSeconds);

public sealed record SendPhoneVerificationCommand(string Phone)
    : IRequest<SendPhoneVerificationResult>;
