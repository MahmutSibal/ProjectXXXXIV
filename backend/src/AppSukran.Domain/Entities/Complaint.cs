using AppSukran.Domain.Common;
using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Entities;

public sealed class Complaint : AggregateRoot
{
    public string? RestaurantId { get; set; }
    public string RestaurantName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public ComplaintStatus Status { get; set; } = ComplaintStatus.New;
    public string Response { get; set; } = string.Empty;
}
