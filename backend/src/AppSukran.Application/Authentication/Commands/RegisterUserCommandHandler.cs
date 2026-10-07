using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed class RegisterUserCommandHandler(
    IUnitOfWork unitOfWork,
    IPasswordHashingService passwordHashingService,
    ITokenService tokenService,
    IRefreshTokenService refreshTokenService,
    ICurrentUserService currentUserService)
    : IRequestHandler<RegisterUserCommand, TokenResponse>
{
    public async Task<TokenResponse> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var userRepository = unitOfWork.Repository<User>();
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await userRepository.AnyAsync(user => user.Email == normalizedEmail, cancellationToken))
        {
            throw new InvalidOperationException("Email already exists.");
        }

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHashingService.HashPassword(request.Password),
            Role = request.Role,
            RestaurantId = string.IsNullOrWhiteSpace(request.RestaurantId) ? null : request.RestaurantId.Trim(),
            IsActive = true
        };

        await userRepository.InsertAsync(user, cancellationToken);

        var refreshToken = refreshTokenService.GenerateRefreshToken();
        var refreshTokenHash = refreshTokenService.HashRefreshToken(refreshToken);
        var storedRefreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAt = refreshTokenService.GetExpiryUtc(),
            CreatedAt = DateTime.UtcNow
        };

        await unitOfWork.Repository<RefreshToken>().InsertAsync(storedRefreshToken, cancellationToken);

        var token = tokenService.CreateToken(user.Id, user.Email, user.Role, user.RestaurantId);
        return new TokenResponse(token, refreshToken, storedRefreshToken.ExpiresAt);
    }
}