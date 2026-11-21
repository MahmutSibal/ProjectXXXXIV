using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed class LoginUserCommandHandler(
    IUnitOfWork unitOfWork,
    IPasswordHashingService passwordHashingService,
    ITokenService tokenService,
    IRefreshTokenService refreshTokenService,
    ICurrentUserService currentUserService,
    ILoginAttemptGuard loginAttemptGuard)
    : IRequestHandler<LoginUserCommand, TokenResponse>
{
    public async Task<TokenResponse> Handle(LoginUserCommand request, CancellationToken cancellationToken)
    {
        // E-posta her yazma yolunda küçük harfe çevrilerek saklanır; aramayı da
        // normalize edip veritabanına bırakıyoruz (Users.Email üzerinde tekil indeks var).
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var ipAddress = currentUserService.IpAddress;

        // Art arda hatalı denemeden sonra kısa bekleme. Kilit e-posta + IP başınadır.
        if (loginAttemptGuard.GetRemainingLockout(normalizedEmail, ipAddress) is { } remaining)
        {
            var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
            throw new InvalidOperationException($"Çok fazla hatalı deneme yapıldı. Lütfen {minutes} dakika sonra tekrar deneyin veya şifrenizi sıfırlayın.");
        }

        var user = await unitOfWork.Repository<User>()
            .FirstOrDefaultAsync(candidate => candidate.Email == normalizedEmail && candidate.IsActive, cancellationToken);

        if (user is null || !passwordHashingService.VerifyPassword(request.Password, user.PasswordHash))
        {
            loginAttemptGuard.RegisterFailure(normalizedEmail, ipAddress);
            throw new InvalidOperationException("Invalid credentials.");
        }

        loginAttemptGuard.Reset(normalizedEmail, ipAddress);

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