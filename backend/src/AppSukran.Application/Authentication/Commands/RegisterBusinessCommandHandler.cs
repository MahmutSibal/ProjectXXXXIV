using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Application.Subscriptions.Commands;
using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed class RegisterBusinessCommandHandler(
    IUnitOfWork unitOfWork,
    IPasswordHashingService passwordHashingService,
    ITokenService tokenService,
    IRefreshTokenService refreshTokenService,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    IPhoneVerificationGuard phoneVerificationGuard,
    IMediator mediator) : IRequestHandler<RegisterBusinessCommand, TokenResponse>
{
    public async Task<TokenResponse> Handle(RegisterBusinessCommand request, CancellationToken cancellationToken)
    {
        // Telefon doğrulaması: jeton tek kullanımlıktır ve burada tüketilir.
        // Hesap yaratılmadan önce kontrol edilir ki doğrulanmamış numarayla kayıt olmasın.
        await phoneVerificationGuard.EnsureVerifiedAsync(
            request.Phone, request.PhoneVerificationTicket, cancellationToken);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var userRepository = unitOfWork.Repository<User>();
        var existing = await userRepository.FindAsync(user => user.Email == normalizedEmail, cancellationToken);
        if (existing.Count > 0)
        {
            throw new InvalidOperationException("Email already exists.");
        }

        var restaurantRepository = unitOfWork.Repository<Restaurant>();

        // Slug'ı işletme adından üret ve benzersizleştir (Slug üzerinde unique index var).
        var baseSlug = SlugGenerator.Create(request.BusinessName);
        // Çakışma yalnızca aynı önekle başlayan slug'larda olabilir ("kebapci", "kebapci-2", ...),
        // bu yüzden tüm restoranları değil sadece o öneki çekiyoruz (Slug indeksi LIKE 'önek%' ile seek yapar).
        var existingSlugs = (await restaurantRepository
                .FindAsync(restaurant => restaurant.Slug.StartsWith(baseSlug), cancellationToken))
            .Select(restaurant => restaurant.Slug)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var slug = SlugGenerator.MakeUnique(baseSlug, candidate => existingSlugs.Contains(candidate));

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = new User
            {
                Name = request.OwnerName.Trim(),
                Email = normalizedEmail,
                PasswordHash = passwordHashingService.HashPassword(request.Password),
                Role = UserRole.RestaurantOwner,
                IsActive = true,
            };
            await userRepository.InsertAsync(user, cancellationToken);

            var restaurant = new Restaurant
            {
                Name = request.BusinessName.Trim(),
                Slug = slug,
                OwnerId = user.Id,
                Address = request.Address.Trim(),
                Longitude = request.Longitude,
                Latitude = request.Latitude,
            };
            await restaurantRepository.InsertAsync(restaurant, cancellationToken);

            // Kullanıcıyı restoranına bağla — token'daki restaurantId claim'i buradan gelir.
            user.RestaurantId = restaurant.Id;
            await userRepository.ReplaceAsync(user, cancellationToken);

            await mediator.Send(new StartTrialCommand(restaurant.Id), cancellationToken);

            var refreshToken = refreshTokenService.GenerateRefreshToken();
            var storedRefreshToken = new RefreshToken
            {
                UserId = user.Id,
                TokenHash = refreshTokenService.HashRefreshToken(refreshToken),
                ExpiresAt = refreshTokenService.GetExpiryUtc(),
                CreatedAt = DateTime.UtcNow,
            };
            await unitOfWork.Repository<RefreshToken>().InsertAsync(storedRefreshToken, cancellationToken);

            await unitOfWork.CommitAsync(cancellationToken);

            await auditLogService.RecordAsync(
                "BusinessRegistered", nameof(Restaurant), restaurant.Id,
                $"{restaurant.Name} self-servis olarak kaydoldu. Telefon: {request.Phone.Trim()}",
                user.Id, cancellationToken);

            var accessToken = tokenService.CreateToken(user.Id, user.Email, user.Role, user.RestaurantId);
            return new TokenResponse(accessToken, refreshToken, storedRefreshToken.ExpiresAt);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
