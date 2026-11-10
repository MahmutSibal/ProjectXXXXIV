using System.Text.Json;
using AppSukran.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

internal static class ConfigurationExtensions
{
    public static void ConfigureAggregateRoot<TEntity>(this EntityTypeBuilder<TEntity> builder)
        where TEntity : AggregateRoot
    {
        builder.HasKey(entity => entity.Id);
        builder.Property(entity => entity.Id).HasMaxLength(32).ValueGeneratedNever();
        builder.Property(entity => entity.Version).IsConcurrencyToken();
    }

    /// <summary>Basit string listelerini (Ingredients, Tags gibi) ayrı bir tabloya gerek kalmadan tek bir JSON sütununda saklar.</summary>
    public static PropertyBuilder<List<string>> HasJsonStringListConversion(this PropertyBuilder<List<string>> builder)
    {
        var comparer = new ValueComparer<List<string>>(
            (left, right) => (left ?? new()).SequenceEqual(right ?? new()),
            list => list.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
            list => list.ToList());

        builder.HasConversion(
            list => JsonSerializer.Serialize(list ?? new List<string>(), (JsonSerializerOptions?)null),
            // Boş metin, sütun sonradan eklendiğinde eski satırlarda kalmış olabilir; boş liste sayılır.
            json => string.IsNullOrWhiteSpace(json)
                ? new List<string>()
                : JsonSerializer.Deserialize<List<string>>(json, (JsonSerializerOptions?)null) ?? new List<string>());
        builder.Metadata.SetValueComparer(comparer);
        return builder;
    }

    /// <summary>Basit değer listelerini (ör. malzeme fiyatları) tek bir JSON sütununda saklar.</summary>
    public static PropertyBuilder<List<T>> HasJsonListConversion<T>(this PropertyBuilder<List<T>> builder)
    {
        var comparer = new ValueComparer<List<T>>(
            (left, right) => (left ?? new()).SequenceEqual(right ?? new()),
            list => list.Aggregate(0, (hash, item) => HashCode.Combine(hash, item)),
            list => list.ToList());

        builder.HasConversion(
            list => JsonSerializer.Serialize(list ?? new List<T>(), (JsonSerializerOptions?)null),
            json => string.IsNullOrWhiteSpace(json)
                ? new List<T>()
                : JsonSerializer.Deserialize<List<T>>(json, (JsonSerializerOptions?)null) ?? new List<T>());
        builder.Metadata.SetValueComparer(comparer);
        return builder;
    }
}
