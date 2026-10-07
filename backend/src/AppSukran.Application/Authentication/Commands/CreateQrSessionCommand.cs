using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed record CreateQrSessionCommand(string RestaurantId, int TableNo, string QrToken) : IRequest<QrSessionResponse>;

public sealed record QrSessionResponse(
    string AccessToken,
    DateTime ExpiresAt,
    string RestaurantId,
    int TableNo,
    string TableSessionId);
