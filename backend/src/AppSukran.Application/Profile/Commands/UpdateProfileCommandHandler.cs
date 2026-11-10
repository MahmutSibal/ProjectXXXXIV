using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Profile.Commands;

public sealed class UpdateProfileCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<UpdateProfileCommand, UserResponse>
{
    public async Task<UserResponse> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");

        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length < 2)
        {
            throw new InvalidOperationException("Ad en az 2 karakter olmalı.");
        }

        var repository = unitOfWork.Repository<User>();
        var user = await repository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("Kullanıcı bulunamadı.");

        user.Name = name;

        if (request.Phone is not null)
        {
            var phone = request.Phone.Trim();
            if (phone.Length > 0 && !System.Text.RegularExpressions.Regex.IsMatch(phone, @"^\+?[0-9 ()-]{10,20}$"))
            {
                throw new InvalidOperationException("Geçerli bir telefon numarası girin.");
            }
            user.Phone = phone.Length == 0 ? null : phone;
        }

        if (request.Address is not null)
        {
            var address = request.Address.Trim();
            if (address.Length > 500)
            {
                throw new InvalidOperationException("Adres en fazla 500 karakter olabilir.");
            }
            user.Address = address.Length == 0 ? null : address;
        }

        // Rıza her verilişinde zamanı güncellenir; geri çekilince kanıt tarihi de silinir.
        if (request.MarketingConsent is bool consent && consent != user.MarketingConsent)
        {
            user.MarketingConsent = consent;
            user.MarketingConsentAt = consent ? DateTime.UtcNow : null;
        }

        await repository.ReplaceAsync(user, cancellationToken);

        return new UserResponse(user.Id, user.Name, user.Email, user.Role, user.RestaurantId, user.IsActive, user.Phone, user.Address, user.MarketingConsent);
    }
}
