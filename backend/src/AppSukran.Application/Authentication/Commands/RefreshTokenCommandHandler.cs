using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed class RefreshTokenCommandHandler(IUnitOfWork unitOfWork, ITokenService tokenService, IRefreshTokenService refreshTokenService)
    : IRequestHandler<RefreshTokenCommand, TokenResponse>
{
    public async Task<TokenResponse> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var refreshTokenHash = refreshTokenService.HashRefreshToken(request.RefreshToken);
        var storedRefreshToken = await unitOfWork.Repository<RefreshToken>()
            .FirstOrDefaultAsync(token => token.TokenHash == refreshTokenHash, cancellationToken)
            ?? throw new InvalidOperationException("Invalid refresh token.");

        if (storedRefreshToken.IsRevoked || storedRefreshToken.IsExpired)
        {
            throw new InvalidOperationException("Invalid refresh token.");
        }

        var user = await unitOfWork.Repository<User>().GetByIdAsync(storedRefreshToken.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        storedRefreshToken.RevokedAt = DateTime.UtcNow;

        var newRefreshToken = refreshTokenService.GenerateRefreshToken();
        var newRefreshTokenHash = refreshTokenService.HashRefreshToken(newRefreshToken);
        storedRefreshToken.ReplacedByTokenHash = newRefreshTokenHash;

        var newStoredRefreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newRefreshTokenHash,
            ExpiresAt = refreshTokenService.GetExpiryUtc(),
            CreatedAt = DateTime.UtcNow
        };

        await unitOfWork.Repository<RefreshToken>().ReplaceAsync(storedRefreshToken, cancellationToken);
        await unitOfWork.Repository<RefreshToken>().InsertAsync(newStoredRefreshToken, cancellationToken);

        var accessToken = tokenService.CreateToken(user.Id, user.Email, user.Role, user.RestaurantId);
        return new TokenResponse(accessToken, newRefreshToken, newStoredRefreshToken.ExpiresAt);
    }
}