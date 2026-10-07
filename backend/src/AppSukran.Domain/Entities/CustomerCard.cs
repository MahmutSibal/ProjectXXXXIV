using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

public sealed class CustomerCard : AggregateRoot
{
    public string UserId { get; set; } = string.Empty;
    public string CardHash { get; set; } = string.Empty;
    public string Last4 { get; set; } = string.Empty;
    public string CardholderName { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public int ExpiryMonth { get; set; }
    public int ExpiryYear { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
}