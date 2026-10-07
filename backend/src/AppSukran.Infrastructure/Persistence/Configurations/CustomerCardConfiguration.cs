using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class CustomerCardConfiguration : IEntityTypeConfiguration<CustomerCard>
{
    public void Configure(EntityTypeBuilder<CustomerCard> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(card => card.UserId).HasMaxLength(160).IsRequired();
        builder.Property(card => card.CardHash).HasMaxLength(256).IsRequired();
        builder.Property(card => card.Last4).HasMaxLength(4);
        builder.Property(card => card.CardholderName).HasMaxLength(200);
        builder.Property(card => card.Brand).HasMaxLength(50);

        builder.HasIndex(card => new { card.UserId, card.IsDefault, card.CreatedAt });
    }
}
