using AppSukran.Domain.Common;

namespace AppSukran.Application.Abstractions.Persistence;

public interface IUnitOfWork
{
    IGenericRepository<TDocument> Repository<TDocument>() where TDocument : AggregateRoot;
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitAsync(CancellationToken cancellationToken = default);
    Task RollbackAsync(CancellationToken cancellationToken = default);
}