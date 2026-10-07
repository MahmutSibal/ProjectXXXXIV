using System.Linq.Expressions;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Common;
using AppSukran.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AppSukran.Infrastructure.Repositories;

public sealed class EfGenericRepository<TDocument>(AppSukranDbContext context) : IGenericRepository<TDocument>
    where TDocument : AggregateRoot
{
    private DbSet<TDocument> Set => context.Set<TDocument>();

    public async Task<TDocument?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
        => await Set.FirstOrDefaultAsync(document => document.Id == id, cancellationToken);

    public async Task<IReadOnlyCollection<TDocument>> GetAllAsync(CancellationToken cancellationToken = default)
        => await Set.ToListAsync(cancellationToken);

    public async Task<IReadOnlyCollection<TDocument>> FindAsync(Expression<Func<TDocument, bool>> predicate, CancellationToken cancellationToken = default)
        => await Set.Where(predicate).ToListAsync(cancellationToken);

    public async Task<TDocument?> FirstOrDefaultAsync(Expression<Func<TDocument, bool>> predicate, CancellationToken cancellationToken = default)
        => await Set.FirstOrDefaultAsync(predicate, cancellationToken);

    public async Task<bool> AnyAsync(Expression<Func<TDocument, bool>> predicate, CancellationToken cancellationToken = default)
        => await Set.AnyAsync(predicate, cancellationToken);

    public async Task<IReadOnlyCollection<TDocument>> QueryAsync<TKey>(
        Expression<Func<TDocument, bool>>? predicate,
        Expression<Func<TDocument, TKey>> orderBy,
        bool descending,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        IQueryable<TDocument> query = Set;

        if (predicate is not null)
        {
            query = query.Where(predicate);
        }

        query = descending ? query.OrderByDescending(orderBy) : query.OrderBy(orderBy);

        // Id ile ikincil sıralama: sıralama anahtarı eşit olan kayıtlarda SQL Server'ın
        // satır sırası garantili değildir, bu da sayfalar arasında kayıt tekrarına/kaybına yol açar.
        query = ((IOrderedQueryable<TDocument>)query).ThenBy(document => document.Id);

        if (skip > 0)
        {
            query = query.Skip(skip);
        }

        return await query.Take(take).ToListAsync(cancellationToken);
    }

    public async Task<int> CountAsync(Expression<Func<TDocument, bool>>? predicate = null, CancellationToken cancellationToken = default)
        => predicate is null
            ? await Set.CountAsync(cancellationToken)
            : await Set.CountAsync(predicate, cancellationToken);

    public async Task<TDocument> InsertAsync(TDocument document, CancellationToken cancellationToken = default)
    {
        await Set.AddAsync(document, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return document;
    }

    public async Task<TDocument> ReplaceAsync(TDocument document, CancellationToken cancellationToken = default)
    {
        var entry = context.Entry(document);
        if (entry.State == EntityState.Detached)
        {
            Set.Attach(document);
            entry.State = EntityState.Modified;
        }

        document.Version += 1;

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new InvalidOperationException("Concurrency conflict detected.", exception);
        }

        return document;
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var document = await Set.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (document is null)
        {
            return;
        }

        Set.Remove(document);
        await context.SaveChangesAsync(cancellationToken);
    }
}
