using System.Security.Claims;
using AppSukran.Application.Abstractions.Security;
using Microsoft.AspNetCore.Http;

namespace AppSukran.Infrastructure.Security;

public sealed class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public string? UserId => httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Name);
    public string? Email => httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email);
    public string? Role => httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);
    public string? RestaurantId => httpContextAccessor.HttpContext?.User?.FindFirstValue("restaurantId");
    public string? IpAddress => httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
    public bool IsAuthenticated => httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;
    public bool IsInRole(string role) => httpContextAccessor.HttpContext?.User?.IsInRole(role) == true;
}