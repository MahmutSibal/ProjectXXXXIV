using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

/// <summary>
/// <see cref="Bill"/>, <see cref="Order"/>'ın alan eklemeyen bir alt sınıfıdır (sipariş
/// kapanıp hesaba dönüştüğünde aynı kayıt "Bill" olarak da okunur). Tek "Orders" tablosunda
/// Table-Per-Hierarchy (TPH) + Discriminator ile eşlenir.
/// </summary>
public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.ToTable("Orders");
        builder.Property(order => order.RestaurantId).HasMaxLength(32).IsRequired();

        builder.HasIndex(order => new { order.RestaurantId, order.TableNo, order.SessionStatus });

        builder.HasDiscriminator<string>("OrderKind")
            .HasValue<Order>("Order")
            .HasValue<Bill>("Bill");

        builder.OwnsMany(order => order.Items, item =>
        {
            item.ToTable("OrderItems");
            item.WithOwner().HasForeignKey("OrderId");
            item.HasKey(i => i.OrderItemId);
            item.Property(i => i.MenuItemId).HasMaxLength(32).IsRequired();
            item.Property(i => i.Name).HasMaxLength(200).IsRequired();
            item.Property(i => i.OrderedBy).HasMaxLength(200);
        });
        builder.Navigation(order => order.Items).AutoInclude();
    }
}
