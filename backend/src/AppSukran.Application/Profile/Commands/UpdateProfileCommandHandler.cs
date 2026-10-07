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
        await repository.ReplaceAsync(user, cancellationToken);

        return new UserResponse(user.Id, user.Name, user.Email, user.Role, user.RestaurantId, user.IsActive);
    }
}
