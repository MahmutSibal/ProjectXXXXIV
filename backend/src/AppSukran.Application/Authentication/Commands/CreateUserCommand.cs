using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

/// <summary>
/// SuperAdmin tarafından panelden yeni kullanıcı oluşturur. Token üretmez,
/// yalnızca oluşturulan kullanıcının kimliğini (Id) döndürür.
/// </summary>
public sealed record CreateUserCommand(
    string Name,
    string Email,
    string Password,
    UserRole Role,
    string? RestaurantId = null) : IRequest<string>;
