using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.PaymentSetup.Queries;

public sealed record PaymentOptionsResponse(bool CardPaymentsEnabled);

/// <summary>
/// Herkese açık: online kart ödemesi platform genelinde açık mı.
/// Kayıt yoksa veya herhangi bir hata olursa true döner; asla hata fırlatmaz.
/// </summary>
public sealed record GetPaymentOptionsQuery : IRequest<PaymentOptionsResponse>;

public sealed class GetPaymentOptionsQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetPaymentOptionsQuery, PaymentOptionsResponse>
{
    public async Task<PaymentOptionsResponse> Handle(GetPaymentOptionsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var settings = await unitOfWork.Repository<PlatformPaymentSettings>()
                .GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);

            return settings is null
                ? new PaymentOptionsResponse(true)
                : new PaymentOptionsResponse(settings.CardPaymentsEnabled);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception)
        {
            return new PaymentOptionsResponse(true);
        }
    }
}
