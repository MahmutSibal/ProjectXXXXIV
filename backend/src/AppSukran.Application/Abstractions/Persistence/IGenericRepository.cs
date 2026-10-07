using System.Linq.Expressions;
using AppSukran.Domain.Common;

namespace AppSukran.Application.Abstractions.Persistence;

public interface IGenericRepository<TDocument> where TDocument : AggregateRoot
{
    Task<TDocument?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<TDocument>> GetAllAsync(CancellationToken cancellationToken = default);

    /// Sunucu (veritabanı) tarafında filtreleyerek yalnızca eşleşen kayıtları getirir.
    /// Tüm koleksiyonu belleğe çekmeden alt küme okumak için kullanılır.
    Task<IReadOnlyCollection<TDocument>> FindAsync(Expression<Func<TDocument, bool>> predicate, CancellationToken cancellationToken = default);

    /// Koşula uyan ilk kaydı getirir; yoksa null döner.
    /// Tek kayıt aranırken GetAllAsync + LINQ yerine bunu kullanın — aksi hâlde
    /// tek satır için tüm tablo belleğe çekilir.
    Task<TDocument?> FirstOrDefaultAsync(Expression<Func<TDocument, bool>> predicate, CancellationToken cancellationToken = default);

    /// Koşula uyan kayıt var mı? Veritabanında EXISTS olarak çalışır, veri taşımaz.
    Task<bool> AnyAsync(Expression<Func<TDocument, bool>> predicate, CancellationToken cancellationToken = default);

    /// Filtreleme, sıralama ve sayfalamayı veritabanına bırakır (ORDER BY + OFFSET/FETCH).
    /// Sınırsız büyüyen tablolarda (denetim kaydı, sipariş geçmişi) tek doğru okuma yolu budur.
    Task<IReadOnlyCollection<TDocument>> QueryAsync<TKey>(
        Expression<Func<TDocument, bool>>? predicate,
        Expression<Func<TDocument, TKey>> orderBy,
        bool descending,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    /// Koşula uyan kayıt sayısı. Sayfalamada toplam sayfa hesabı için kullanılır.
    Task<int> CountAsync(Expression<Func<TDocument, bool>>? predicate = null, CancellationToken cancellationToken = default);
    Task<TDocument> InsertAsync(TDocument document, CancellationToken cancellationToken = default);
    Task<TDocument> ReplaceAsync(TDocument document, CancellationToken cancellationToken = default);
    Task DeleteAsync(string id, CancellationToken cancellationToken = default);
}