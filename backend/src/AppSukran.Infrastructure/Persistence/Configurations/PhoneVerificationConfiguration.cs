using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Entity = AppSukran.Domain.Entities.PhoneVerification;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class PhoneVerificationConfiguration : IEntityTypeConfiguration<Entity>
{
    public void Configure(EntityTypeBuilder<Entity> builder)
    {
        builder.ConfigureAggregateRoot();

        builder.Property(verification => verification.Phone).HasMaxLength(20).IsRequired();
        // SHA-256 hex = 64 karakter.
        builder.Property(verification => verification.CodeHash).HasMaxLength(64).IsRequired();
        builder.Property(verification => verification.TicketHash).HasMaxLength(64);

        // "Bu numaranın en son kaydı" sorgusu her gönderim ve doğrulamada çalışır.
        builder.HasIndex(verification => new { verification.Phone, verification.CreatedAt });
    }
}
