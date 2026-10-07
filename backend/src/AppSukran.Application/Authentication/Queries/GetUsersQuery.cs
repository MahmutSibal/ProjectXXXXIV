using AppSukran.Application.Common.Models;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Authentication.Queries;

/// <param name="RestaurantId">Verilirse yalnızca o restorana bağlı kullanıcılar.</param>
/// <param name="OnlyWithoutRestaurant">
/// Yalnızca hiçbir restorana bağlı olmayan kullanıcılar (restoran sahibi adayları).
/// <paramref name="RestaurantId"/> ile birlikte kullanılmaz.
/// </param>
public sealed record GetUsersQuery(
    int? Page = null,
    int? PageSize = null,
    string? Search = null,
    UserRole? Role = null,
    string? RestaurantId = null,
    bool OnlyWithoutRestaurant = false) : IRequest<PagedResult<UserResponse>>;
