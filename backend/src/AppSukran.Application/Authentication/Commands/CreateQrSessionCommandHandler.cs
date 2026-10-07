using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed class CreateQrSessionCommandHandler(IUnitOfWork unitOfWork, ITokenService tokenService)
    : IRequestHandler<CreateQrSessionCommand, QrSessionResponse>
{
    public async Task<QrSessionResponse> Handle(CreateQrSessionCommand request, CancellationToken cancellationToken)
    {
        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        var table = restaurant.Tables.FirstOrDefault(candidate => candidate.TableNo == request.TableNo)
            ?? throw new InvalidOperationException("Table not found.");

        if (table.Status != RestaurantTableStatus.Occupied ||
            table.SessionClosedAt.HasValue ||
            string.IsNullOrEmpty(table.QrToken) ||
            !string.Equals(table.QrToken, request.QrToken, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Invalid or expired table session.");
        }

        var qrSession = tokenService.CreateQrSessionToken(restaurant.Id, table.TableNo, table.TableSessionId, table.QrToken);

        return new QrSessionResponse(
            qrSession.AccessToken,
            qrSession.ExpiresAt,
            restaurant.Id,
            table.TableNo,
            table.TableSessionId);
    }
}
