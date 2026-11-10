using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppSukran.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundsProductFieldsPayoutTerms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Users",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MarketingConsent",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "MarketingConsentAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Users",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Topic",
                table: "SupportRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CommissionPercent",
                table: "RestaurantPaymentSettings",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PayoutSettlementDays",
                table: "RestaurantPaymentSettings",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Extras",
                table: "OrderItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<int>(
                name: "Calories",
                table: "MenuItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IngredientPrices",
                table: "MenuItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<int>(
                name: "StockQuantity",
                table: "MenuItems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RefundRequests",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RestaurantId = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    TableNo = table.Column<int>(type: "int", nullable: false),
                    TableSessionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Method = table.Column<int>(type: "int", nullable: false),
                    Iban = table.Column<string>(type: "nvarchar(26)", maxLength: 26, nullable: true),
                    AccountHolderName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ResolutionNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResolvedByUserId = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefundRequests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RefundRequests_RestaurantId_Status",
                table: "RefundRequests",
                columns: new[] { "RestaurantId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefundRequests");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MarketingConsent",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MarketingConsentAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Topic",
                table: "SupportRequests");

            migrationBuilder.DropColumn(
                name: "CommissionPercent",
                table: "RestaurantPaymentSettings");

            migrationBuilder.DropColumn(
                name: "PayoutSettlementDays",
                table: "RestaurantPaymentSettings");

            migrationBuilder.DropColumn(
                name: "Extras",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Calories",
                table: "MenuItems");

            migrationBuilder.DropColumn(
                name: "IngredientPrices",
                table: "MenuItems");

            migrationBuilder.DropColumn(
                name: "StockQuantity",
                table: "MenuItems");
        }
    }
}
