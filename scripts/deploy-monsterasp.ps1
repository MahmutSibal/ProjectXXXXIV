<#
.SYNOPSIS
    Ana backend, yedek backend ve frontend'i MonsterASP'a tek komutla yayınlar.

.DESCRIPTION
    Sıra bilerek böyledir:
      1. Yedek backend  -> sağlıklı mı? Değilse DURUR, ana sunucuya dokunulmaz.
      2. Ana backend    -> sağlıklı mı?
      3. Frontend

    Sırlar: ortam değişkenleri (bkz. DEPLOYMENT.md 3.1) tanımlı değilse, canlıdaki ana
    sunucunun web.config'inden OKUNUR. Böylece yedek, ana sunucuyla birebir aynı
    veritabanını ve JWT anahtarını kullanır (farklı olursa oturumlar düşer, işletmelerin
    şifreli değerler çözülemez).

    Parolalar panelden indirilen yayın profillerinden (Download publish profile) okunur;
    ekrana yazdırılmaz. Yayın sonrası, sır içeren publish\primary ve publish\backup
    klasörleri silinir.

    Sunucudaki fazla dosyalar SİLİNMEZ (DoNotDeleteRule): wwwroot\uploads altındaki
    işletme görselleri ve loglar korunur.

.EXAMPLE
    .\scripts\deploy-monsterasp.ps1 `
        -PrimaryProfile  "$HOME\Downloads\mahmutapp.tryasp.net.PublishSettings" `
        -BackupProfile   "$HOME\Downloads\mahmutapp.runasp.net.PublishSettings" `
        -FrontendProfile "$HOME\Downloads\sukranapp.runasp.net.PublishSettings"

.EXAMPLE
    # Yalnızca derle, hiçbir şey gönderme (sırlar ortam değişkenlerinden).
    .\scripts\deploy-monsterasp.ps1 -SkipDeploy
#>
[CmdletBinding()]
param(
    [string]$PrimaryProfile,
    [string]$BackupProfile,
    [string]$FrontendProfile,

    [string]$PrimaryHost  = 'mahmutapp.tryasp.net',
    [string]$BackupHost   = 'mahmutapp.runasp.net',
    [string]$FrontendHost = 'sukranapp.runasp.net',

    # Yedek başka fiziksel sunucuda. Veritabanının iç adı (dbXXXXX.databaseasp.net)
    # oradan çözülmezse genel adla (dbXXXXX.public.databaseasp.net) bir dize verin.
    [string]$BackupDbConnection,

    # Masa QR kodlarına gömülen adres. Basılmış QR kodlarıyla AYNI olmalı.
    [string]$PublicAppUrl,

    [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$msdeploy = 'C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe'
$primaryOut = Join-Path $root 'publish\primary'
$backupOut  = Join-Path $root 'publish\backup'
$frontendOut = Join-Path $root 'frontend\dist'

if (-not $PublicAppUrl) { $PublicAppUrl = "https://$FrontendHost" }

function Write-Step([string]$text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }

# --- Yayın profilleri -------------------------------------------------------

function Read-PublishProfile([string]$path) {
    if (-not (Test-Path $path)) { throw "Yayın profili bulunamadı: $path" }

    [xml]$xml = Get-Content $path -Raw
    $p = $xml.publishData.publishProfile | Where-Object { $_.publishMethod -eq 'MSDeploy' } | Select-Object -First 1
    if ($null -eq $p) { throw "Profilde WebDeploy (MSDeploy) bölümü yok: $path" }

    $server = $p.publishUrl -replace '^https?://', '' -replace '/.*$', ''
    if ($server -notmatch ':\d+$') { $server = "${server}:8172" }

    [pscustomobject]@{
        Site     = $p.msdeploySite
        Endpoint = "https://$server/msdeploy.axd?site=$($p.msdeploySite)"
        User     = $p.userName
        Password = $p.userPWD
    }
}

function Get-DestinationArgs($profile, [string]$provider, [string]$path) {
    "-dest:$provider=$path,computerName=$($profile.Endpoint),userName=$($profile.User),password=$($profile.Password),authType=Basic"
}

function Invoke-MsDeploy([string[]]$arguments) {
    # Windows PowerShell 5.1'de 'Stop' iken stderr'e yazılan her satır betiği durdurur;
    # başarı çıkış koduna bakılarak değerlendirilir.
    $ErrorActionPreference = 'Continue'
    # Parola argümanda olduğu için çıktı/hata metninden maskelenir.
    $output = & $msdeploy @arguments 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        $masked = $output
        foreach ($p in @($script:profiles.Values)) {
            if ($p -and $p.Password) { $masked = $masked.Replace($p.Password, '********') }
        }
        throw "msdeploy başarısız (çıkış kodu $LASTEXITCODE):`n$masked"
    }
    return $output
}

function Publish-Folder($profile, [string]$sourceDir) {
    $arguments = @(
        '-verb:sync',
        "-source:contentPath=$sourceDir",
        (Get-DestinationArgs $profile 'contentPath' $profile.Site),
        # Kopyalarken siteyi "bakımda" sayfasına alır; kilitli DLL hatasını önler.
        '-enableRule:AppOffline',
        # Sunucudaki fazla dosyaları silme: işletme görselleri (wwwroot\uploads) korunur.
        '-enableRule:DoNotDeleteRule',
        '-retryAttempts:3',
        '-retryInterval:3000'
    )
    $output = Invoke-MsDeploy $arguments
    ($output -split "`n" | Where-Object { $_ -match 'Total changes|Toplam değişiklik' }) | ForEach-Object { Write-Host "  $($_.Trim())" }
}

# --- Canlı ayarları okuma ---------------------------------------------------

function Get-LiveEnvironment($profile) {
    $temp = Join-Path ([IO.Path]::GetTempPath()) ("sukran-live-" + [guid]::NewGuid().ToString('N'))
    try {
        # Paylaşımlı barındırmada yalnızca site düzeyinde contentPath'e izin var
        # (filePath "ERROR_EXCEPTION_WHILE_CREATING_OBJECT" ile reddedilir). Siteyi
        # okuyoruz ama web.config dışındaki her dosyayı atlıyoruz; inen yalnızca o.
        Invoke-MsDeploy @(
            '-verb:sync',
            ("-source:contentPath=$($profile.Site),computerName=$($profile.Endpoint)," +
             "userName=$($profile.User),password=$($profile.Password),authType=Basic"),
            "-dest:contentPath=$temp",
            '-skip:objectName=filePath,absolutePath=(?i)(?<!\\web\.config)$'
        ) | Out-Null

        # Alt klasörlerde de web.config olabilir; sitenin kökündekini (en sığ) al.
        $file = Get-ChildItem $temp -Filter web.config -Recurse -File |
            Sort-Object { $_.FullName.Split('\').Count } | Select-Object -First 1
        if ($null -eq $file) { throw "Canlı sunucuda web.config bulunamadı ($($profile.Site))." }

        [xml]$config = Get-Content $file.FullName -Raw
        $result = [ordered]@{}
        foreach ($node in $config.SelectNodes('//aspNetCore/environmentVariables/environmentVariable')) {
            $result[$node.name] = $node.value
        }
        return $result
    }
    finally {
        # Sır taşıyan geçici dosya diskte kalmasın.
        if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
    }
}

function Wait-Healthy([string]$apiHost, [string]$instance) {
    $deadline = (Get-Date).AddMinutes(3)
    $lastError = ''
    while ((Get-Date) -lt $deadline) {
        try {
            $ready  = Invoke-RestMethod "https://$apiHost/api/health/ready" -TimeoutSec 30
            $health = Invoke-RestMethod "https://$apiHost/api/health" -TimeoutSec 30
            if ($ready.database -and $health.instance -eq $instance) {
                Write-Host "  $apiHost sağlıklı (instance=$($health.instance), veritabanı bağlı)" -ForegroundColor Green
                return
            }
            $lastError = "instance=$($health.instance), database=$($ready.database)"
        }
        catch {
            $lastError = $_.Exception.Message
        }
        Start-Sleep -Seconds 10
    }
    throw "$apiHost sağlıklı hâle gelmedi ($lastError)."
}

# --- Ön kontroller ----------------------------------------------------------

$script:profiles = @{}
if (-not $SkipDeploy) {
    if (-not (Test-Path $msdeploy)) { throw "Web Deploy bulunamadı: $msdeploy" }
    foreach ($pair in @(@('primary', $PrimaryProfile), @('backup', $BackupProfile), @('frontend', $FrontendProfile))) {
        if ([string]::IsNullOrWhiteSpace($pair[1])) { throw "-$($pair[0]) profili verilmedi (-PrimaryProfile, -BackupProfile, -FrontendProfile)." }
        $script:profiles[$pair[0]] = Read-PublishProfile $pair[1]
    }
}

# --- Sırlar ve ayarlar ------------------------------------------------------

Write-Step 'Ayarlar'

$whatsAppBaseUrl = $null
$frontendOrigins = @("https://$FrontendHost")

if ([string]::IsNullOrWhiteSpace($env:SUKRAN_DB_CONNECTION) -or [string]::IsNullOrWhiteSpace($env:JWT_SIGNING_KEY)) {
    if ($SkipDeploy) { throw 'Ortam değişkenleri tanımlı değil ve -SkipDeploy ile canlıdan okunamaz.' }

    Write-Host "Ortam değişkenleri yok; ayarlar canlıdaki ana sunucudan ($PrimaryHost) okunuyor..."
    $live = Get-LiveEnvironment $script:profiles['primary']

    # iyzico anahtarları artık okunmaz: iyzico kaldırıldı, yeni web.config'e yazılmaz.
    foreach ($name in 'SUKRAN_DB_CONNECTION', 'JWT_SIGNING_KEY', 'SUKRAN_SUPERADMIN_PASSWORD') {
        if ($live.Contains($name)) { Set-Item "env:$name" $live[$name] }
    }
    if ($live.Contains('SUKRAN_WHATSAPP_TOKEN')) { $env:WHATSAPP_SERVICE_TOKEN = $live['SUKRAN_WHATSAPP_TOKEN'] }
    if ($live['WhatsApp__Enabled'] -eq 'true') { $whatsAppBaseUrl = $live['WhatsApp__BaseUrl'] }

    # E-posta ayarları canlıdan taşınır; aksi hâlde her deploy e-posta doğrulamasını
    # kapatırdı. Bu oturumda elle verilmiş bir değer varsa (ilk kurulum) o önceliklidir.
    if ($live['Email__Enabled'] -eq 'true') {
        $emailMap = [ordered]@{
            'SUKRAN_SMTP_PASSWORD'  = 'SUKRAN_SMTP_PASSWORD'
            'SUKRAN_EMAIL_HOST'     = 'Email__Host'
            'SUKRAN_EMAIL_PORT'     = 'Email__Port'
            'SUKRAN_EMAIL_USERNAME' = 'Email__Username'
            'SUKRAN_EMAIL_FROM'     = 'Email__FromAddress'
        }
        foreach ($envName in $emailMap.Keys) {
            $liveName = $emailMap[$envName]
            if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($envName)) -and $live.Contains($liveName)) {
                Set-Item "env:$envName" $live[$liveName]
            }
        }
    }

    $liveOrigins = $live.Keys | Where-Object { $_ -like 'Cors__AllowedOrigins__*' } | ForEach-Object { $live[$_] }
    $frontendOrigins = @($frontendOrigins + $liveOrigins | Select-Object -Unique)

    Write-Host "  Okunan ayarlar: $(($live.Keys | Where-Object { $_ -notmatch 'PASSWORD|KEY|SECRET|CONNECTION|TOKEN' }) -join ', ')"
    Write-Host "  Sırlar okundu (değerleri yazdırılmaz)."
}

Write-Host "  CORS          : $($frontendOrigins -join ', ')"
Write-Host "  WhatsApp      : $(if ($whatsAppBaseUrl) { $whatsAppBaseUrl } else { 'kapalı' })"
Write-Host "  E-posta       : $(if ($env:SUKRAN_SMTP_PASSWORD) { "açık ($(if ($env:SUKRAN_EMAIL_FROM) { $env:SUKRAN_EMAIL_FROM } else { 'gönderici eksik' }))" } else { 'kapalı' })"
Write-Host "  Kart ödemesi  : kapalı (PayTR bağlanana kadar)"
Write-Host "  QR adresi     : $PublicAppUrl"

$commonArgs = @{ FrontendOrigin = $frontendOrigins }
if ($whatsAppBaseUrl) { $commonArgs.WhatsAppBaseUrl = $whatsAppBaseUrl }

try {
    # --- Derleme ------------------------------------------------------------

    Write-Step 'Backend derleniyor (ana)'
    & (Join-Path $PSScriptRoot 'publish-monsterasp.ps1') -SiteHost $PrimaryHost -InstanceName 'primary' -OutputPath $primaryOut @commonArgs

    Write-Step 'Backend derleniyor (yedek)'
    $originalDb = $env:SUKRAN_DB_CONNECTION
    try {
        if ($BackupDbConnection) { $env:SUKRAN_DB_CONNECTION = $BackupDbConnection }
        & (Join-Path $PSScriptRoot 'publish-monsterasp.ps1') -SiteHost $BackupHost -InstanceName 'backup' -OutputPath $backupOut @commonArgs
    }
    finally {
        $env:SUKRAN_DB_CONNECTION = $originalDb
    }

    Write-Step 'Frontend derleniyor'
    Push-Location (Join-Path $root 'frontend')
    # npm/vite uyarıları stderr'e yazar; 5.1'de 'Stop' bunları hata sayar.
    # Başarı aşağıda çıkış koduyla denetlenir.
    $ErrorActionPreference = 'Continue'
    try {
        # Vite değerleri derleme anında koda gömer.
        $env:VITE_API_BASE_URL = "https://$PrimaryHost/api"
        $env:VITE_API_FALLBACK_URLS = "https://$BackupHost/api"
        $env:VITE_PUBLIC_APP_URL = $PublicAppUrl
        & npm ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'npm ci başarısız.' }
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend derlemesi başarısız.' }
    }
    finally {
        $ErrorActionPreference = 'Stop'
        Pop-Location
        Remove-Item env:VITE_API_BASE_URL, env:VITE_API_FALLBACK_URLS, env:VITE_PUBLIC_APP_URL -ErrorAction SilentlyContinue
    }

    if ($SkipDeploy) {
        Write-Host "`n-SkipDeploy: derleme tamam, hiçbir şey gönderilmedi." -ForegroundColor Yellow
        return
    }

    # --- Yayın --------------------------------------------------------------

    Write-Step "1/3 Yedek backend -> $BackupHost"
    Publish-Folder $script:profiles['backup'] $backupOut
    try {
        Wait-Healthy $BackupHost 'backup'
    }
    catch {
        throw ("Yedek sağlıklı değil; ANA SUNUCUYA DOKUNULMADI. $($_.Exception.Message)`n" +
               "Veritabanı iç adı yedek sunucudan çözülmüyor olabilir: -BackupDbConnection ile " +
               "dbXXXXX.public.databaseasp.net adresli bir dize verin (bkz. DEPLOYMENT.md 4.1).")
    }

    Write-Step "2/3 Ana backend -> $PrimaryHost"
    Publish-Folder $script:profiles['primary'] $primaryOut
    Wait-Healthy $PrimaryHost 'primary'

    Write-Step "3/3 Frontend -> $FrontendHost"
    Publish-Folder $script:profiles['frontend'] $frontendOut
    $page = Invoke-WebRequest "https://$FrontendHost/" -UseBasicParsing -TimeoutSec 60
    if ($page.StatusCode -ne 200) { throw "Frontend $($page.StatusCode) döndü." }
    Write-Host "  $FrontendHost yanıt veriyor (200)" -ForegroundColor Green

    Write-Host "`nYayın tamamlandı." -ForegroundColor Green
}
finally {
    if (-not $SkipDeploy) {
        # Bu klasörlerdeki web.config'ler sırları AÇIK METİN taşır.
        foreach ($dir in $primaryOut, $backupOut) {
            if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
        }
    }
}
