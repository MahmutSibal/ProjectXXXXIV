namespace AppSukran.Application.Common.Models;

public sealed record CustomerCardResponse(
    string Id,
    string CardholderName,
    string Brand,
    string Last4,
    int ExpiryMonth,
    int ExpiryYear,
    bool IsDefault,
    bool IsActive,
    DateTime CreatedAt);