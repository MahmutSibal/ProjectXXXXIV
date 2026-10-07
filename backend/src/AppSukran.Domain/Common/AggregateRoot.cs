namespace AppSukran.Domain.Common;

public abstract class AggregateRoot
{
    protected AggregateRoot()
    {
        Id = Guid.NewGuid().ToString("N");
        CreatedAt = DateTime.UtcNow;
    }

    public string Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long Version { get; set; }
}