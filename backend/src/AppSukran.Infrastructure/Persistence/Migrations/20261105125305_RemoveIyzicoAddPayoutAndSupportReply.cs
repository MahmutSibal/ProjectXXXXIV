using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppSukran.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIyzicoAddPayoutAndSupportReply : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoRenew",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "PaymentMethodBrand",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "PaymentMethodLast4",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "PaymentMethodToken",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "PaymentMethodUserKey",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "ApiKeyProtected",
                table: "RestaurantPaymentSettings");

            migrationBuilder.DropColumn(
                name: "Provider",
                table: "RestaurantPaymentSettings");

            migrationBuilder.DropColumn(
                name: "SecretKeyProtected",
                table: "RestaurantPaymentSettings");

            migrationBuilder.DropColumn(
                name: "ShowIyzicoLogos",
                table: "PlatformPaymentSettings");

            // EF bunu BaseUrl -> AccountHolderBusinessName yeniden adlandırması olarak
            // üretmişti; o hâlde işletme adına eski iyzico adresi taşınırdı. İki ayrı
            // alan oldukları için eskisi silinip yenisi boş eklenir.
            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "RestaurantPaymentSettings");

            migrationBuilder.AddColumn<string>(
                name: "AccountHolderBusinessName",
                table: "RestaurantPaymentSettings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "SupportRequests",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RepliedAt",
                table: "SupportRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reply",
                table: "SupportRequests",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccountHolderFullName",
                table: "RestaurantPaymentSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Iban",
                table: "RestaurantPaymentSettings",
                type: "nvarchar(26)",
                maxLength: 26,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_SupportRequests_CreatedByUserId",
                table: "SupportRequests",
                column: "CreatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SupportRequests_CreatedByUserId",
                table: "SupportRequests");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "SupportRequests");

            migrationBuilder.DropColumn(
                name: "RepliedAt",
                table: "SupportRequests");

            migrationBuilder.DropColumn(
                name: "Reply",
                table: "SupportRequests");

            migrationBuilder.DropColumn(
                name: "AccountHolderFullName",
                table: "RestaurantPaymentSettings");

            migrationBuilder.DropColumn(
                name: "Iban",
                table: "RestaurantPaymentSettings");

            migrationBuilder.DropColumn(
                name: "AccountHolderBusinessName",
                table: "RestaurantPaymentSettings");

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "RestaurantPaymentSettings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "AutoRenew",
                table: "Subscriptions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethodBrand",
                table: "Subscriptions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethodLast4",
                table: "Subscriptions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethodToken",
                table: "Subscriptions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethodUserKey",
                table: "Subscriptions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApiKeyProtected",
                table: "RestaurantPaymentSettings",
                type: "nvarchar(1024)",
                maxLength: 1024,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "RestaurantPaymentSettings",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SecretKeyProtected",
                table: "RestaurantPaymentSettings",
                type: "nvarchar(1024)",
                maxLength: 1024,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "ShowIyzicoLogos",
                table: "PlatformPaymentSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }
    }
}
