using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ConfigureAggregateRoot();
        // Normal kullanıcılar için 32 karakterlik GUID yeterli, ama QR oturumu (masadan
        // sipariş veren müşteri) sentetik bir "qr:{restaurantId}:{tableNo}:{tableSessionId}"
        // kimliği kullanır — bu çok daha uzun olabildiği için geniş tutuluyor.
        builder.Property(log => log.ActorUserId).HasMaxLength(160);
        builder.Property(log => log.Action).HasMaxLength(200).IsRequired();
        builder.Property(log => log.EntityType).HasMaxLength(200).IsRequired();
        builder.Property(log => log.EntityId).HasMaxLength(64).IsRequired();
        builder.Property(log => log.Details).HasMaxLength(2000);
        builder.HasIndex(log => new { log.CreatedAt, log.EntityType, log.EntityId });
        // Owner'ın log listesi kendi personelinin kimlikleriyle filtrelenip tarihe göre
        // sıralanır; bu indeks olmadan sorgu her seferinde tüm tabloyu tarar.
        builder.HasIndex(log => new { log.ActorUserId, log.CreatedAt });
    }
}
