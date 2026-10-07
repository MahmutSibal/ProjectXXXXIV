using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Common;
using AppSukran.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;

namespace AppSukran.Infrastructure.Repositories;

public sealed class EfUnitOfWork(AppSukranDbContext context, IServiceProvider serviceProvider) : IUnitOfWork
{
    private IDbContextTransaction? _currentTransaction;

    public IGenericRepository<TDocument> Repository<TDocument>() where TDocument : AggregateRoot
        => serviceProvider.GetRequiredService<IGenericRepository<TDocument>>();

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
        => _currentTransaction = await context.Database.BeginTransactionAsync(cancellationToken);

    public async Task CommitAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction is null)
        {
            return;
        }

        await _currentTransaction.CommitAsync(cancellationToken);
        await _currentTransaction.DisposeAsync();
        _currentTransaction = null;
    }

    public async Task RollbackAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction is null)
        {
            return;
        }

        await _currentTransaction.RollbackAsync(cancellationToken);
        await _currentTransaction.DisposeAsync();
        _currentTransaction = null;
    }
}
