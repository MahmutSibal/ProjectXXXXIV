using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppSukran.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCardRefundsAndRenewalReminders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "RenewalReminderSentFor",
                table: "Subscriptions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastRefundAt",
                table: "CardPayments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "RefundedMinor",
                table: "CardPayments",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RenewalReminderSentFor",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "LastRefundAt",
                table: "CardPayments");

            migrationBuilder.DropColumn(
                name: "RefundedMinor",
                table: "CardPayments");
        }
    }
}
