<#
.SYNOPSIS
    AppSukranDb veritabanının yedeğini alır ve eski yedekleri temizler.

.DESCRIPTION
    Günlük çalıştırılmak üzere tasarlanmıştır (Görev Zamanlayıcı).
    Yedekler sıkıştırılır ve varsayılan olarak 30 günden eski olanlar silinir.

.EXAMPLE
    .\backup-database.ps1 -BackupPath "D:\Yedekler\sukran"

.EXAMPLE
    # Görev Zamanlayıcı ile her gece 03:00'te:
    schtasks /create /tn "Sukran DB Yedek" /tr "powershell -File C:\sukran\scripts\backup-database.ps1" /sc daily /st 03:00 /ru SYSTEM
#>
param(
    [string]$ServerInstance = "localhost\SQLEXPRESS",
    [string]$DatabaseName = "AppSukranDb",
    # Boş bırakılırsa SQL Server'ın kendi varsayılan yedek klasörü kullanılır.
    # ÖNEMLİ: BACKUP DATABASE komutunu sizin kullanıcınız değil, SQL Server SERVİS
    # HESABI çalıştırır. Bu yüzden hedef klasöre servis hesabının yazma izni olmalıdır;
    # aksi hâlde "Operating system error 5 (Erişim engellendi)" alınır.
    [string]$BackupPath = "",
    [int]$RetentionDays = 30,
    [string]$UploadsPath = "",
    [switch]$SkipUploads
)

$ErrorActionPreference = "Stop"

function Write-Log([string]$Message) {
    Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

try {
    if ([string]::IsNullOrWhiteSpace($BackupPath)) {
        $pathConnection = New-Object System.Data.SqlClient.SqlConnection(
            "Data Source=$ServerInstance;Initial Catalog=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True")
        $pathConnection.Open()
        $pathCommand = $pathConnection.CreateCommand()
        $pathCommand.CommandText = "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000))"
        $BackupPath = $pathCommand.ExecuteScalar()
        $pathConnection.Close()
        Write-Log "Yedek klasörü verilmedi; SQL Server varsayılanı kullanılıyor: $BackupPath"
    }

    if (-not (Test-Path $BackupPath)) {
        New-Item -ItemType Directory -Force -Path $BackupPath | Out-Null
        Write-Log "Yedek klasörü oluşturuldu: $BackupPath"
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = Join-Path $BackupPath "$DatabaseName-$timestamp.bak"

    Write-Log "Veritabanı yedeği alınıyor: $DatabaseName -> $backupFile"

    $connectionString = "Data Source=$ServerInstance;Initial Catalog=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True"
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()

    # Express Edition sıkıştırmalı yedeği DESTEKLEMEZ; sürüme göre uyarlanır.
    $editionCommand = $connection.CreateCommand()
    $editionCommand.CommandText = "SELECT CAST(SERVERPROPERTY('Edition') AS nvarchar(200))"
    $edition = $editionCommand.ExecuteScalar()
    $supportsCompression = $edition -notmatch "Express"

    $compressionOption = if ($supportsCompression) { "COMPRESSION, " } else { "" }
    if (-not $supportsCompression) {
        Write-Log "Sürüm: $edition — sıkıştırma desteklenmiyor, sıkıştırmasız yedek alınacak."
    }

    $command = $connection.CreateCommand()
    # CHECKSUM + VERIFYONLY: bozuk yedek alınmasını erken yakalar.
    $command.CommandText = @"
BACKUP DATABASE [$DatabaseName]
TO DISK = N'$backupFile'
WITH FORMAT, INIT, ${compressionOption}CHECKSUM,
     NAME = N'$DatabaseName tam yedek',
     DESCRIPTION = N'Otomatik günlük yedek'
"@
    $command.CommandTimeout = 3600
    $command.ExecuteNonQuery() | Out-Null

    Write-Log "Yedek doğrulanıyor..."
    $verify = $connection.CreateCommand()
    $verify.CommandText = "RESTORE VERIFYONLY FROM DISK = N'$backupFile'"
    $verify.CommandTimeout = 3600
    $verify.ExecuteNonQuery() | Out-Null

    # Boyutu SQL Server'dan sor: yedek klasörü çoğu zaman yalnızca servis hesabına
    # açıktır, dosyayı doğrudan okumaya çalışmak "erişim engellendi" verebilir.
    $sizeCommand = $connection.CreateCommand()
    $sizeCommand.CommandText = @"
SELECT TOP 1 CAST(backup_size / 1048576.0 AS decimal(10,2))
FROM msdb.dbo.backupset
WHERE database_name = @db
ORDER BY backup_finish_date DESC
"@
    $sizeCommand.Parameters.AddWithValue("@db", $DatabaseName) | Out-Null
    $sizeMb = try { $sizeCommand.ExecuteScalar() } catch { $null }

    $connection.Close()

    if ($null -ne $sizeMb) {
        Write-Log "Yedek tamamlandı ve doğrulandı ($sizeMb MB)."
    }
    else {
        Write-Log "Yedek tamamlandı ve doğrulandı."
    }

    # Yüklenen görseller veritabanında değil diskte tutulur; onları da yedekle.
    if (-not $SkipUploads) {
        if ([string]::IsNullOrWhiteSpace($UploadsPath)) {
            $UploadsPath = Join-Path $PSScriptRoot "..\backend\src\AppSukran.API\wwwroot\uploads"
        }

        if (Test-Path $UploadsPath) {
            $uploadsZip = Join-Path $BackupPath "uploads-$timestamp.zip"
            Compress-Archive -Path "$UploadsPath\*" -DestinationPath $uploadsZip -Force -ErrorAction SilentlyContinue
            if (Test-Path $uploadsZip) {
                Write-Log "Yüklenen görseller yedeklendi: $uploadsZip"
            }
        }
        else {
            Write-Log "Yükleme klasörü bulunamadı, atlanıyor: $UploadsPath"
        }
    }

    # Saklama süresi dolmuş yedekleri sil. Klasöre erişilemiyorsa (yedekler yalnızca
    # servis hesabına açık bir konumdaysa) bu adım uyarı verir ama işi başarısız saymaz.
    try {
        $cutoff = (Get-Date).AddDays(-$RetentionDays)
        $old = Get-ChildItem -Path $BackupPath -Include "*.bak", "*.zip" -File -Recurse -ErrorAction Stop |
               Where-Object { $_.LastWriteTime -lt $cutoff }

        foreach ($file in $old) {
            Remove-Item $file.FullName -Force
            Write-Log "Eski yedek silindi: $($file.Name)"
        }
    }
    catch {
        Write-Log "UYARI: Eski yedekler temizlenemedi ($($_.Exception.Message))."
        Write-Log "       Yedek klasörüne bu hesabın erişimi yoksa -BackupPath ile erişilebilir bir klasör verin."
    }

    Write-Log "İşlem başarıyla tamamlandı."
    exit 0
}
catch {
    Write-Log "HATA: $($_.Exception.Message)"

    if ($_.Exception.Message -match "Operating system error 5|Cannot open backup device") {
        Write-Log ""
        Write-Log "ÇÖZÜM: Yedek komutunu SQL Server servis hesabı çalıştırır, sizin hesabınız değil."
        Write-Log "Hedef klasöre servis hesabına yazma izni verin, örnek:"
        $serviceName = ($ServerInstance -split '\\')[-1]
        Write-Log "  icacls `"$BackupPath`" /grant `"NT Service\MSSQL`$$serviceName`:(OI)(CI)M`""
        Write-Log "Ya da -BackupPath parametresini hiç vermeyip SQL Server'ın varsayılan klasörünü kullanın."
    }

    exit 1
}
