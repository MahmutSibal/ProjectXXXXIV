using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppSukran.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlanCatalogSettings",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    AnnualDiscountPercent = table.Column<int>(type: "int", nullable: false),
                    TrialDays = table.Column<int>(type: "int", nullable: false),
                    PriceVersion = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanCatalogSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlanSettings",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Plan = table.Column<int>(type: "int", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    MonthlyPrice = table.Column<long>(type: "bigint", nullable: false),
                    DiscountPercent = table.Column<int>(type: "int", nullable: false),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsHighlighted = table.Column<bool>(type: "bit", nullable: false),
                    Bullets = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    HasOrdering = table.Column<bool>(type: "bit", nullable: false),
                    MaxQrOrdersPerPeriod = table.Column<int>(type: "int", nullable: true),
                    MaxKitchenPanels = table.Column<int>(type: "int", nullable: true),
                    MaxWaiterPanels = table.Column<int>(type: "int", nullable: true),
                    HasDetailedReports = table.Column<bool>(type: "bit", nullable: false),
                    HasEvents = table.Column<bool>(type: "bit", nullable: false),
                    MaxTables = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlanSettings_Plan",
                table: "PlanSettings",
                column: "Plan",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlanCatalogSettings");

            migrationBuilder.DropTable(
                name: "PlanSettings");
        }
    }
}
