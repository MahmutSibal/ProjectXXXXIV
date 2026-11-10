using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Common;
using MediatR;

namespace AppSukran.Application.PhoneVerification.Commands;

public sealed class VerifyPhoneCodeCommandHandler(
    IUnitOfWork unitOfWork,
    IVerificationCodeService codeService,
    IPhoneVerificationPolicy policy)
    : IRequestHandler<VerifyPhoneCodeCommand, VerifyPhoneCodeResult>
{
    public Task<VerifyPhoneCodeResult> Handle(VerifyPhoneCodeCommand request, CancellationToken cancellationToken)
        => VerificationCodeFlow.VerifyAsync(
            unitOfWork, codeService, policy, PhoneNumber.Normalize(request.Phone), request.Code, cancellationToken);
}
