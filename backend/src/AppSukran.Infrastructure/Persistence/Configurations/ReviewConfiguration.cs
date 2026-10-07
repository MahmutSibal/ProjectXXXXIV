using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(review => review.RestaurantId).HasMaxLength(32).IsRequired();
        // QR oturumundaki müşteriler için sentetik ("qr:...") kimlik kullanılır, 32'den uzun olabilir.
        builder.Property(review => review.UserId).HasMaxLength(160).IsRequired();
        builder.Property(review => review.UserName).HasMaxLength(200);
        builder.Property(review => review.Comment).HasMaxLength(2000);

        builder.HasIndex(review => review.RestaurantId);
        // "Yorumlarım" listesi (UserId) ve tek-yorum kuralı kontrolü (UserId + RestaurantId).
        builder.HasIndex(review => new { review.UserId, review.RestaurantId });

        builder.OwnsMany(review => review.Reactions, reaction =>
        {
            reaction.ToTable("ReviewReactions");
            reaction.WithOwner().HasForeignKey("ReviewId");
            reaction.HasKey(r => r.Id);
            reaction.Property(r => r.Id).HasMaxLength(32).ValueGeneratedNever();
            reaction.Property(r => r.UserId).HasMaxLength(160).IsRequired();
            reaction.HasIndex("ReviewId", nameof(ReviewReaction.UserId)).IsUnique();
        });
        builder.Navigation(review => review.Reactions).AutoInclude();

        builder.OwnsMany(review => review.Replies, reply =>
        {
            reply.ToTable("ReviewReplies");
            reply.WithOwner().HasForeignKey("ReviewId");
            reply.HasKey(r => r.Id);
            reply.Property(r => r.Id).HasMaxLength(32).ValueGeneratedNever();
            reply.Property(r => r.UserId).HasMaxLength(160).IsRequired();
            reply.Property(r => r.UserName).HasMaxLength(200);
            reply.Property(r => r.MentionedUserName).HasMaxLength(200);
            reply.Property(r => r.Comment).HasMaxLength(2000);
        });
        builder.Navigation(review => review.Replies).AutoInclude();
    }
}
