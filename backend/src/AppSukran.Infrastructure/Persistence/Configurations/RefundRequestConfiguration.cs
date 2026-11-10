using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class RefundRequestConfiguration : IEntityTypeConfiguration<RefundRequest>
{
    public void Configure(EntityTypeBuilder<RefundRequest> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(request => request.RestaurantId).HasMaxLength(32).IsRequired();
        builder.Property(request => request.TableSessionId).HasMaxLength(64).IsRequired();
        builder.Property(request => request.Content).HasMaxLength(1000).IsRequired();
        builder.Property(request => request.Iban).HasMaxLength(TurkishIban.Length);
        builder.Property(request => request.AccountHolderName).HasMaxLength(150);
        builder.Property(request => request.ResolutionNote).HasMaxLength(500);
        builder.Property(request => request.ResolvedByUserId).HasMaxLength(32);

        builder.HasIndex(request => new { request.RestaurantId, request.Status });
    }
}
