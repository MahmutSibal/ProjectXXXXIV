using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppSukran.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PayTrCardPaymentsRemoveStoredCards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerCards");

            migrationBuilder.CreateTable(
                name: "CardPayments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    MerchantOid = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Purpose = table.Column<int>(type: "int", nullable: false),
                    RestaurantId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    BillId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    TableNo = table.Column<int>(type: "int", nullable: true),
                    ItemIds = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Plan = table.Column<int>(type: "int", nullable: true),
                    BillingPeriodMonths = table.Column<int>(type: "int", nullable: true),
                    AmountMinor = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PaidTotalMinor = table.Column<long>(type: "bigint", nullable: true),
                    FailReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TestMode = table.Column<bool>(type: "bit", nullable: false),
                    ReturnPath = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    TransferStatus = table.Column<int>(type: "int", nullable: false),
                    SubmerchantAmountMinor = table.Column<long>(type: "bigint", nullable: true),
                    TransferTransId = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    TransferReference = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TransferError = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TransferRequestedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardPayments", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CardPayments_MerchantOid",
                table: "CardPayments",
                column: "MerchantOid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CardPayments_RestaurantId",
                table: "CardPayments",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_CardPayments_TransferStatus_Status",
                table: "CardPayments",
                columns: new[] { "TransferStatus", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CardPayments");

            migrationBuilder.CreateTable(
                name: "CustomerCards",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Brand = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CardHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    CardholderName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiryMonth = table.Column<int>(type: "int", nullable: false),
                    ExpiryYear = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    Last4 = table.Column<string>(type: "nvarchar(4)", maxLength: 4, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerCards", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerCards_UserId_IsDefault_CreatedAt",
                table: "CustomerCards",
                columns: new[] { "UserId", "IsDefault", "CreatedAt" });
        }
    }
}
