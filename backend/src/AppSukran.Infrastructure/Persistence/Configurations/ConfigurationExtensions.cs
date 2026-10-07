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
            json => JsonSerializer.Deserialize<List<string>>(json, (JsonSerializerOptions?)null) ?? new List<string>());
        builder.Metadata.SetValueComparer(comparer);
        return builder;
    }
}
