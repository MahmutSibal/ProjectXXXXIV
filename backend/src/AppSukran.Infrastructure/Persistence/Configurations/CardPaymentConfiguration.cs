using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class CardPaymentConfiguration : IEntityTypeConfiguration<CardPayment>
{
    public void Configure(EntityTypeBuilder<CardPayment> builder)
    {
        builder.ConfigureAggregateRoot();

        builder.Property(payment => payment.MerchantOid).HasMaxLength(64).IsRequired();
        // Aynı sipariş no ile iki kayıt olamaz; PayTR bildirimi bu alanla eşleştirilir.
        builder.HasIndex(payment => payment.MerchantOid).IsUnique();

        builder.Property(payment => payment.RestaurantId).HasMaxLength(64).IsRequired();
        builder.Property(payment => payment.BillId).HasMaxLength(64);
        builder.Property(payment => payment.ItemIds).HasJsonStringListConversion();
        builder.Property(payment => payment.FailReason).HasMaxLength(500);
        builder.Property(payment => payment.ReturnPath).HasMaxLength(400).IsRequired();
        builder.Property(payment => payment.TransferTransId).HasMaxLength(60);
        builder.Property(payment => payment.TransferReference).HasMaxLength(100);
        builder.Property(payment => payment.TransferError).HasMaxLength(500);

        // Günlük transfer görevi: "başarılı, transferi bekleyen" kayıtlar.
        builder.HasIndex(payment => new { payment.TransferStatus, payment.Status });
        builder.HasIndex(payment => payment.RestaurantId);
    }
}
