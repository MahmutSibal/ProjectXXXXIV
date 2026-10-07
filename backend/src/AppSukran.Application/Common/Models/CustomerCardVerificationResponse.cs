namespace AppSukran.Application.Common.Models;

public sealed record CustomerCardVerificationResponse(bool IsValid, string Brand, string Last4, string Message);