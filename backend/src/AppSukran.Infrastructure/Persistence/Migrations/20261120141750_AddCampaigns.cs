using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppSukran.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Kampanya tablosu. Bu migration'ın ilk (görselsiz) hâli bazı veritabanlarına zaten uygulandı
    /// (tablo var, görsel sütunları yok); sonradan yeniden üretildiği için kimliği değişti.
    /// Bu yüzden her iki durumda da çalışır: tablo yoksa kurar, varsa eksik sütunları ekler.
    /// </summary>
    public partial class AddCampaigns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[Campaigns]', N'U') IS NULL
BEGIN
    CREATE TABLE [Campaigns] (
        [Id] nvarchar(32) NOT NULL,
        [Subject] nvarchar(150) NOT NULL,
        [Body] nvarchar(max) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [RecipientCount] int NOT NULL,
        [SentCount] int NOT NULL,
        [FailedCount] int NOT NULL,
        [ImageUrl] nvarchar(500) NULL,
        [ButtonText] nvarchar(40) NULL,
        [ButtonUrl] nvarchar(500) NULL,
        [IsRich] bit NOT NULL,
        [CreatedByUserId] nvarchar(64) NULL,
        [CompletedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [Version] bigint NOT NULL,
        CONSTRAINT [PK_Campaigns] PRIMARY KEY ([Id])
    );
END
ELSE
BEGIN
    IF COL_LENGTH(N'Campaigns', N'ImageUrl') IS NULL ALTER TABLE [Campaigns] ADD [ImageUrl] nvarchar(500) NULL;
    IF COL_LENGTH(N'Campaigns', N'ButtonText') IS NULL ALTER TABLE [Campaigns] ADD [ButtonText] nvarchar(40) NULL;
    IF COL_LENGTH(N'Campaigns', N'ButtonUrl') IS NULL ALTER TABLE [Campaigns] ADD [ButtonUrl] nvarchar(500) NULL;
    IF COL_LENGTH(N'Campaigns', N'IsRich') IS NULL ALTER TABLE [Campaigns] ADD [IsRich] bit NOT NULL CONSTRAINT [DF_Campaigns_IsRich] DEFAULT 0;
END
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Campaigns_CreatedAt' AND object_id = OBJECT_ID(N'[Campaigns]'))
    CREATE INDEX [IX_Campaigns_CreatedAt] ON [Campaigns] ([CreatedAt]);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF OBJECT_ID(N'[Campaigns]', N'U') IS NOT NULL DROP TABLE [Campaigns];");
        }
    }
}
