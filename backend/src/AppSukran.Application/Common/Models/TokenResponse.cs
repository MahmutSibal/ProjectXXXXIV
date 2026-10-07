namespace AppSukran.Application.Common.Models;

public sealed record TokenResponse(string AccessToken, string RefreshToken, DateTime RefreshTokenExpiresAt);