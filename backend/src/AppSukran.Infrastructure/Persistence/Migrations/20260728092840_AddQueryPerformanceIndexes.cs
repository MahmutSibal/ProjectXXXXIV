using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppSukran.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQueryPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Reviews_UserId_RestaurantId",
                table: "Reviews",
                columns: new[] { "UserId", "RestaurantId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActorUserId_CreatedAt",
                table: "AuditLogs",
                columns: new[] { "ActorUserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reviews_UserId_RestaurantId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_ActorUserId_CreatedAt",
                table: "AuditLogs");
        }
    }
}
