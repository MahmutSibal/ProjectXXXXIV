<#
.SYNOPSIS
    Veritabanındaki tüm işletme/kullanıcı verisini siler; yalnızca tek bir Süper Admin hesabını bırakır.

.DESCRIPTION
    Varsayılan çalıştırma KURU ÇALIŞTIRMADIR: neyin silineceğini ve satır sayılarını gösterir, hiçbir şeyi silmez.
    Gerçekten silmek için -Execute verin. Silmeden önce silinecek tüm tabloların CSV yedeği alınır.

    Korunanlar: __EFMigrationsHistory, sysdiagrams, MaintenanceSettings, PlatformPaymentSettings
    (bakım/sunucu durumu ve Havale/EFT ayarları) ve -KeepSuperAdminEmail ile verilen tek Süper Admin.
    Silinenler: diğer tüm kullanıcılar ve geri kalan tüm tablolar (restoranlar, siparişler, adisyonlar, yorumlar,
    şikayetler, abonelikler, ödemeler, denetim kayıtları, oturum jetonları, kayıtlı kartlar vb.).

    Bu betik yüklenen görsel dosyalarına (sunucudaki uploads klasörü) DOKUNMAZ.

.EXAMPLE
    $env:SUKRAN_DB_CONNECTION = "Server=...; Database=...; User Id=...; Password=...; Encrypt=True; TrustServerCertificate=True;"
    powershell -File scripts\reset-database.ps1
    powershell -File scripts\reset-database.ps1 -Execute
#>
param(
    [string]$ConnectionString = $env:SUKRAN_DB_CONNECTION,
    [string]$KeepSuperAdminEmail = 'superadmin@sukranapp.com',
    [string]$BackupDir = (Join-Path (Get-Location) ("db-backup-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))),
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
    throw "Bağlantı dizesi yok. SUKRAN_DB_CONNECTION ortam değişkenini ayarlayın veya -ConnectionString verin."
}

$keepTables = @('__EFMigrationsHistory', 'sysdiagrams', 'MaintenanceSettings', 'PlatformPaymentSettings')
$superAdminRole = 1

$conn = New-Object System.Data.SqlClient.SqlConnection $ConnectionString
$conn.Open()

function Query($sql, $tx = $null) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql; $cmd.Transaction = $tx
    $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
    $dt = New-Object System.Data.DataTable; [void]$da.Fill($dt); , $dt
}

# Korunacak Süper Admin gerçekten var mı ve gerçekten Süper Admin mi?
$keeper = (Query "SELECT Id, Email, Role, IsActive FROM Users WHERE Email = '$($KeepSuperAdminEmail.Replace("'", "''"))'").Rows | Select-Object -First 1
if (-not $keeper -or [int]$keeper.Role -ne $superAdminRole -or -not $keeper.IsActive) {
    throw "Korunacak Süper Admin bulunamadı veya aktif Süper Admin değil: $KeepSuperAdminEmail. İşlem iptal edildi."
}

$allTables = @((Query "SELECT name FROM sys.tables").Rows | ForEach-Object { $_.name })
$wipeTables = @($allTables | Where-Object { $_ -notin $keepTables -and $_ -ne 'Users' })

# Yabancı anahtar bağımlılıkları (kendine referanslar yok sayılır): çocuk tablolar önce silinir.
$edges = @((Query "SELECT OBJECT_NAME(parent_object_id) AS child, OBJECT_NAME(referenced_object_id) AS parent FROM sys.foreign_keys WHERE parent_object_id <> referenced_object_id").Rows |
    ForEach-Object { [pscustomobject]@{ Child = $_.child; Parent = $_.parent } })

$ordered = New-Object System.Collections.Generic.List[string]
$remaining = New-Object System.Collections.Generic.List[string]
$wipeTables + 'Users' | ForEach-Object { $remaining.Add($_) }
while ($remaining.Count -gt 0) {
    $ready = @($remaining | Where-Object {
        $t = $_
        -not ($edges | Where-Object { $_.Parent -eq $t -and $remaining.Contains($_.Child) })
    })
    if ($ready.Count -eq 0) { throw "Yabancı anahtar döngüsü çözülemedi: $($remaining -join ', ')" }
    foreach ($t in $ready) { $ordered.Add($t); [void]$remaining.Remove($t) }
}

Write-Host ""
Write-Host "Korunacak Süper Admin: $($keeper.Email)" -ForegroundColor Green
Write-Host "Korunan tablolar     : $($keepTables -join ', ')" -ForegroundColor Green
Write-Host ""
Write-Host "Silme planı (sıra ile):" -ForegroundColor Yellow
$plan = foreach ($t in $ordered) {
    $count = [int](Query "SELECT COUNT(*) AS n FROM [$t]").Rows[0].n
    $willDelete = if ($t -eq 'Users') { [int](Query "SELECT COUNT(*) AS n FROM Users WHERE Id <> '$($keeper.Id)'").Rows[0].n } else { $count }
    [pscustomobject]@{ Tablo = $t; Mevcut = $count; Silinecek = $willDelete }
}
$plan | Format-Table -AutoSize

if (-not $Execute) {
    Write-Host "KURU ÇALIŞTIRMA: hiçbir şey silinmedi. Silmek için -Execute ekleyin." -ForegroundColor Cyan
    $conn.Close(); return
}

# Yedek: silinecek her tablo CSV olarak (parola özetleri ve jeton içerir; güvenli saklayın).
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
foreach ($row in $plan) {
    if ($row.Mevcut -gt 0) {
        (Query "SELECT * FROM [$($row.Tablo)]") | ForEach-Object { $_ | Export-Csv -Path (Join-Path $BackupDir "$($row.Tablo).csv") -NoTypeInformation -Encoding UTF8 }
    }
}
Write-Host "Yedek alındı: $BackupDir" -ForegroundColor Green

$tx = $conn.BeginTransaction()
try {
    foreach ($t in $ordered) {
        $cmd = $conn.CreateCommand(); $cmd.Transaction = $tx
        if ($t -eq 'Users') {
            $cmd.CommandText = "DELETE FROM Users WHERE Id <> @keep"
            [void]$cmd.Parameters.AddWithValue('@keep', $keeper.Id)
        } else {
            $cmd.CommandText = "DELETE FROM [$t]"
        }
        $n = $cmd.ExecuteNonQuery()
        Write-Host ("  {0,-28} {1} satır silindi" -f $t, $n)
    }

    # Doğrulama: tek kullanıcı kaldı mı ve o Süper Admin mi?
    $left = Query "SELECT Email, Role FROM Users" $tx
    if ($left.Rows.Count -ne 1 -or $left.Rows[0].Email -ne $keeper.Email) { throw "Doğrulama başarısız: beklenen tek kullanıcı kalmadı." }

    $tx.Commit()
    Write-Host ""
    Write-Host "TAMAMLANDI. Kalan tek kullanıcı: $($left.Rows[0].Email)" -ForegroundColor Green
}
catch {
    $tx.Rollback()
    Write-Host "HATA, tüm işlem geri alındı: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
finally {
    $conn.Close()
}
