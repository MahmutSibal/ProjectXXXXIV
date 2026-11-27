<#
.SYNOPSIS
    Ana backend, yedek backend(ler) ve frontend'i (cPanel + MonsterASP) tek komutla yayınlar.

.DESCRIPTION
    Sıra bilerek böyledir:
      1. Yedek backend(ler) -> sağlıklı mı? Değilse DURUR, ana sunucuya dokunulmaz.
         (-Backup2Profile verilirse ikinci yedek de aynı kontrolden geçer.)
      2. Ana backend    -> sağlıklı mı?
      3. Frontend (MonsterASP, eski adres $FrontendHost: cPanel doğrulanınca $SiteDomain'e 301 yönlendirir)
      4. Frontend (cPanel, $SiteDomain) - scripts\publish-cpanel.ps1 ile (cPanel API, HTTPS)

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
    # İkinci yedek backend (isteğe bağlı). Verilmezse yalnızca tek yedek kullanılır.
    [string]$Backup2Profile,
    [string]$FrontendProfile,

    [string]$PrimaryHost  = 'mahmutapp.tryasp.net',
    [string]$BackupHost   = 'mahmutapp.runasp.net',
    [string]$FrontendHost = 'sukranapp.runasp.net',

    # Yedek başka fiziksel sunucuda. Veritabanının iç adı (dbXXXXX.databaseasp.net)
    # oradan çözülmezse genel adla (dbXXXXX.public.databaseasp.net) bir dize verin.
    [string]$BackupDbConnection,

    # İkinci yedeğin adresi; boşsa yayın profilindeki site adı kullanılır.
    [string]$Backup2Host,
    # İkinci yedek için veritabanı dizesi; boşsa -BackupDbConnection, o da boşsa ana dize.
    [string]$Backup2DbConnection,

    # Sitenin asıl alan adı (cPanel'de yayınlanır). PayTR dönüşü, e-posta bağlantıları ve
    # yeni QR kodları bu adrese gider. Eski $FrontendHost da çalışmaya devam eder
    # (basılmış eski QR kodları için). Boş verilirse yalnızca $FrontendHost kullanılır.
    [string]$SiteDomain = 'sukranapp.com',

    # Masa QR kodlarına gömülen adres. Boşsa https://$SiteDomain.
    [string]$PublicAppUrl,

    # Hesabın bulunduğu cPanel sunucusu (HTTPS API). Bkz. scripts\publish-cpanel.ps1.
    [string]$CpanelUrl = 'https://welltechub.com:2083',

    # cPanel'e yüklemeyi atla (yalnızca zip hazırlanır).
    [switch]$SkipCpanel,

    # E-posta gönderici adresi (Brevo'da doğrulanmış olmalı, ör. noreply@sukranapp.com) ve
    # iletişim formu bildirimlerinin gideceği adres (ör. info@sukranapp.com). Bir kez verilmeleri
    # yeterli: canlıya yazılır, sonraki yayınlarda canlıdan aynen taşınır.
    [string]$EmailFrom,
    [string]$EmailNotificationAddress,

    [switch]$SkipDeploy,

    # Sunucu açılmazsa (HTTP 500.30) hata ayrıntısını sunucudaki logs\stdout dosyasına yazdırır.
    # Sorun bulununca kapatın.
    [switch]$EnableStdoutLog
)

$ErrorActionPreference = 'Stop'
# Elle verilen e-posta adresleri canlıdan okunan değerlerin önüne geçer.
if ($EmailFrom) { $env:SUKRAN_EMAIL_FROM = $EmailFrom.Trim() }
if ($EmailNotificationAddress) { $env:SUKRAN_EMAIL_NOTIFY = $EmailNotificationAddress.Trim() }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$msdeploy = 'C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe'
$primaryOut = Join-Path $root 'publish\primary'
$backupOut  = Join-Path $root 'publish\backup'
$backup2Out = Join-Path $root 'publish\backup2'
$frontendOut = Join-Path $root 'frontend\dist'
$redirectOut = Join-Path $root 'publish\redirect'

if (-not $PublicAppUrl) { $PublicAppUrl = if ($SiteDomain) { "https://$SiteDomain" } else { "https://$FrontendHost" } }
$siteZip = if ($SiteDomain) { Join-Path $root "publish\$SiteDomain-site.zip" } else { $null }

function Write-Step([string]$text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }

# cPanel'e yüklenecek zip. Compress-Archive (PowerShell 5.1) klasör ayırıcısını "\" yazar;
# Linux'ta açılınca "assets\index.js" adlı tek dosyalar oluşur. Bu yüzden girişler "/" ile yazılır.
function New-SiteZip([string]$SourceDir, [string]$ZipPath) {
    Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
    New-Item -ItemType Directory -Force -Path (Split-Path $ZipPath) | Out-Null
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
    $base = (Resolve-Path $SourceDir).Path.TrimEnd('\') + '\'
    $zip = [System.IO.Compression.ZipFile]::Open($ZipPath, 'Create')
    try {
        # web.config yalnızca IIS içindir; Apache'de .htaccess kullanılır.
        Get-ChildItem $SourceDir -Recurse -File -Force | Where-Object { $_.Name -ne 'web.config' } | ForEach-Object {
            $entry = $_.FullName.Substring($base.Length).Replace('\', '/')
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry, 'Optimal')
        }
    }
    finally { $zip.Dispose() }
}

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
        # Sitenin genel adresi (ör. mahmutapp.runasp.net); msdeploySite ise iç koddur (site12345).
        AppHost  = ([string]$p.destinationAppUrl -replace '^https?://', '' -replace '/.*$', '')
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

function Publish-Folder($profile, [string]$sourceDir, [switch]$AllowDelete) {
    $arguments = @(
        '-verb:sync',
        "-source:contentPath=$sourceDir",
        (Get-DestinationArgs $profile 'contentPath' $profile.Site),
        # Kopyalarken siteyi "bakımda" sayfasına alır; kilitli DLL hatasını önler.
        '-enableRule:AppOffline',
        '-retryAttempts:3',
        '-retryInterval:3000'
    )
    # Backend'de sunucudaki fazla dosyalar silinmez: işletme görselleri (wwwroot\uploads) korunur.
    if (-not $AllowDelete) { $arguments += '-enableRule:DoNotDeleteRule' }
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
    if ($Backup2Profile) {
        $script:profiles['backup2'] = Read-PublishProfile $Backup2Profile
        if (-not $Backup2Host) { $Backup2Host = $script:profiles['backup2'].AppHost }
        if (-not $Backup2Host) { throw '-Backup2Host verilmedi ve yayın profilinden okunamadı.' }
    }
}

# --- Sırlar ve ayarlar ------------------------------------------------------

Write-Step 'Ayarlar'

$whatsAppBaseUrl = $null
# İlk adres uygulamanın ana adresidir (PayTR dönüşü, e-posta bağlantıları).
$frontendOrigins = if ($SiteDomain) {
    @("https://$SiteDomain", "https://www.$SiteDomain", "https://$FrontendHost")
} else {
    @("https://$FrontendHost")
}

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
    # PayTR ayarları da canlıdan taşınır (elle verilmiş değer önceliklidir).
    if ($live['PayTr__Enabled'] -eq 'true') {
        $payTrMap = [ordered]@{
            'SUKRAN_PAYTR_MERCHANT_ID'   = 'SUKRAN_PAYTR_MERCHANT_ID'
            'SUKRAN_PAYTR_MERCHANT_KEY'  = 'SUKRAN_PAYTR_MERCHANT_KEY'
            'SUKRAN_PAYTR_MERCHANT_SALT' = 'SUKRAN_PAYTR_MERCHANT_SALT'
            'SUKRAN_PAYTR_TEST_MODE'     = 'PayTr__TestMode'
            'SUKRAN_PAYTR_TRANSFERS'     = 'PayTr__TransfersEnabled'
        }
        foreach ($envName in $payTrMap.Keys) {
            $liveName = $payTrMap[$envName]
            if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($envName)) -and $live.Contains($liveName)) {
                Set-Item "env:$envName" $live[$liveName]
            }
        }
    }

    # Robot doğrulaması anahtarları canlıdan taşınır (elle verilmiş değer önceliklidir);
    # aksi hâlde her deploy giriş/kayıttaki doğrulamayı kapatırdı.
    # R2 (görsel depolama) ve Redis (canlı bildirim backplane) ayarları da aynı şekilde taşınır.
    $turnstileMap = [ordered]@{
        'SUKRAN_TURNSTILE_SITE_KEY'   = 'Turnstile__SiteKey'
        'SUKRAN_TURNSTILE_SECRET'     = 'SUKRAN_TURNSTILE_SECRET'
        'SUKRAN_R2_ACCOUNT_ID'        = 'Storage__R2AccountId'
        'SUKRAN_R2_BUCKET'            = 'Storage__R2Bucket'
        'SUKRAN_R2_PUBLIC_URL'        = 'Storage__PublicBaseUrl'
        'SUKRAN_R2_ACCESS_KEY_ID'     = 'SUKRAN_R2_ACCESS_KEY_ID'
        'SUKRAN_R2_SECRET_ACCESS_KEY' = 'SUKRAN_R2_SECRET_ACCESS_KEY'
        'SUKRAN_REDIS_CONNECTION'     = 'SUKRAN_REDIS_CONNECTION'
    }
    foreach ($envName in $turnstileMap.Keys) {
        $liveName = $turnstileMap[$envName]
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($envName)) -and $live.Contains($liveName)) {
            Set-Item "env:$envName" $live[$liveName]
        }
    }

    if ($live['Email__Enabled'] -eq 'true') {
        $emailMap = [ordered]@{
            'SUKRAN_SMTP_PASSWORD'  = 'SUKRAN_SMTP_PASSWORD'
            'SUKRAN_EMAIL_HOST'     = 'Email__Host'
            'SUKRAN_EMAIL_PORT'     = 'Email__Port'
            'SUKRAN_EMAIL_USERNAME' = 'Email__Username'
            'SUKRAN_EMAIL_FROM'     = 'Email__FromAddress'
            'SUKRAN_EMAIL_NOTIFY'   = 'Email__NotificationAddress'
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

    Write-Host "  Okunan ayarlar: $(($live.Keys | Where-Object { $_ -notmatch 'PASSWORD|KEY|SECRET|SALT|CONNECTION|TOKEN' }) -join ', ')"
    Write-Host "  Sırlar okundu (değerleri yazdırılmaz)."
}

Write-Host "  CORS          : $($frontendOrigins -join ', ')"
Write-Host "  WhatsApp      : $(if ($whatsAppBaseUrl) { $whatsAppBaseUrl } else { 'kapalı' })"
Write-Host "  E-posta       : $(if ($env:SUKRAN_SMTP_PASSWORD) { "açık (gönderen $(if ($env:SUKRAN_EMAIL_FROM) { $env:SUKRAN_EMAIL_FROM } else { 'eksik' }), bildirim $(if ($env:SUKRAN_EMAIL_NOTIFY) { $env:SUKRAN_EMAIL_NOTIFY } else { 'gönderen adresine' }))" } else { 'kapalı' })"
$payTrReady = $env:SUKRAN_PAYTR_MERCHANT_ID -and $env:SUKRAN_PAYTR_MERCHANT_KEY -and $env:SUKRAN_PAYTR_MERCHANT_SALT
$payTrTestText = if ($env:SUKRAN_PAYTR_TEST_MODE -eq 'false') { 'CANLI - gerçek para' } else { 'TEST modu' }
$payTrTransferText = if ($env:SUKRAN_PAYTR_TRANSFERS -eq 'true') { 'açık' } else { 'kapalı' }
$r2Ready = $env:SUKRAN_R2_ACCOUNT_ID -and $env:SUKRAN_R2_BUCKET -and $env:SUKRAN_R2_ACCESS_KEY_ID -and $env:SUKRAN_R2_SECRET_ACCESS_KEY
$r2PublicText = if ($env:SUKRAN_R2_PUBLIC_URL -and $env:SUKRAN_R2_PUBLIC_URL -ne '-') { "doğrudan $env:SUKRAN_R2_PUBLIC_URL" } else { 'backend üzerinden sunuluyor' }
Write-Host "  Görseller     : $(if ($r2Ready) { "Cloudflare R2 ($r2PublicText)" } else { 'sunucu diski (R2 ayarları eksik)' })"
Write-Host "  Yük paylaşımı : $(if ($r2Ready -and $env:SUKRAN_REDIS_CONNECTION) { 'açık (Redis + R2: iki sunucu birlikte)' } else { 'kapalı (ana sunucu + yedek)' })"
Write-Host "  Robot doğrul. : $(if ($env:SUKRAN_TURNSTILE_SITE_KEY -and $env:SUKRAN_TURNSTILE_SECRET) { 'açık (Cloudflare Turnstile)' } else { 'kapalı (Turnstile anahtarları yok)' })"
Write-Host "  Kart ödemesi  : $(if ($payTrReady) { "PayTR ($payTrTestText, restoran transferi $payTrTransferText)" } else { 'kapalı (PayTR anahtarları yok)' })"
Write-Host "  QR adresi     : $PublicAppUrl"

$commonArgs = @{ FrontendOrigin = $frontendOrigins }
if ($whatsAppBaseUrl) { $commonArgs.WhatsAppBaseUrl = $whatsAppBaseUrl }
if ($EnableStdoutLog) { $commonArgs.EnableStdoutLog = $true }

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

    if ($Backup2Host) {
        Write-Step 'Backend derleniyor (ikinci yedek)'
        try {
            $db2 = if ($Backup2DbConnection) { $Backup2DbConnection } elseif ($BackupDbConnection) { $BackupDbConnection } else { $null }
            if ($db2) { $env:SUKRAN_DB_CONNECTION = $db2 }
            & (Join-Path $PSScriptRoot 'publish-monsterasp.ps1') -SiteHost $Backup2Host -InstanceName 'backup2' -OutputPath $backup2Out @commonArgs
        }
        finally {
            $env:SUKRAN_DB_CONNECTION = $originalDb
        }
    }

    Write-Step 'Frontend derleniyor'
    Push-Location (Join-Path $root 'frontend')
    # npm/vite uyarıları stderr'e yazar; 5.1'de 'Stop' bunları hata sayar.
    # Başarı aşağıda çıkış koduyla denetlenir.
    $ErrorActionPreference = 'Continue'
    try {
        # Vite değerleri derleme anında koda gömer.
        $env:VITE_API_BASE_URL = "https://$PrimaryHost/api"
        # Sıra önemlidir: ana sunucu düşerse önce birinci, o da düşerse ikinci yedeğe geçilir.
        $env:VITE_API_FALLBACK_URLS = (@("https://$BackupHost/api") + $(if ($Backup2Host) { @("https://$Backup2Host/api") } else { @() })) -join ','
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

    if ($siteZip) {
        Write-Step "cPanel paketi hazırlanıyor ($SiteDomain)"
        New-SiteZip -SourceDir $frontendOut -ZipPath $siteZip
        Write-Host "  Hazır: $siteZip" -ForegroundColor Green
    }

    if ($SkipDeploy) {
        Write-Host "`n-SkipDeploy: derleme tamam, hiçbir şey gönderilmedi." -ForegroundColor Yellow
        return
    }

    # --- Yayın --------------------------------------------------------------

    $total = 3 + $(if ($Backup2Host) { 1 } else { 0 }) + $(if ($SiteDomain -and -not $SkipCpanel) { 1 } else { 0 })
    $step = 1
    Write-Step "$step/$total Yedek backend -> $BackupHost"
    Publish-Folder $script:profiles['backup'] $backupOut
    try {
        Wait-Healthy $BackupHost 'backup'
    }
    catch {
        throw ("Yedek sağlıklı değil; ANA SUNUCUYA DOKUNULMADI. $($_.Exception.Message)`n" +
               "Veritabanı iç adı yedek sunucudan çözülmüyor olabilir: -BackupDbConnection ile " +
               "dbXXXXX.public.databaseasp.net adresli bir dize verin (bkz. DEPLOYMENT.md 4.1).")
    }

    if ($Backup2Host) {
        $step++
        Write-Step "$step/$total İkinci yedek backend -> $Backup2Host"
        Publish-Folder $script:profiles['backup2'] $backup2Out
        try {
            Wait-Healthy $Backup2Host 'backup2'
        }
        catch {
            throw ("İkinci yedek sağlıklı değil; ANA SUNUCUYA DOKUNULMADI. $($_.Exception.Message)`n" +
                   "Veritabanı iç adı bu sunucudan çözülmüyor olabilir: -Backup2DbConnection ile " +
                   "dbXXXXX.public.databaseasp.net adresli bir dize verin.")
        }
    }

    $step++
    Write-Step "$step/$total Ana backend -> $PrimaryHost"
    Publish-Folder $script:profiles['primary'] $primaryOut
    Wait-Healthy $PrimaryHost 'primary'

    # Önce asıl site (cPanel). Eski adres, yeni site doğrulanmadan yönlendirmeye çevrilmez.
    $cpanelOk = $true
    if ($SiteDomain -and -not $SkipCpanel) {
        $step++
        Write-Step "$step/$total Frontend -> $SiteDomain (cPanel)"
        try {
            & (Join-Path $PSScriptRoot 'publish-cpanel.ps1') -SourceDir $frontendOut -SiteDomain $SiteDomain -CpanelUrl $CpanelUrl
        }
        catch {
            # Backend zaten yayında; eski adres de olduğu gibi çalışmaya devam eder.
            $cpanelOk = $false
            Write-Host "  cPanel yüklemesi başarısız: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    $step++
    $redirectOld = $SiteDomain -and -not $SkipCpanel -and $cpanelOk
    if ($redirectOld) {
        Write-Step "$step/$total Eski adres $FrontendHost -> $SiteDomain yönlendirmesi"
        # Eski adrese (ör. basılmış QR kodları) gelen herkes aynı yol ve sorguyla yeni adrese gider.
        New-Item -ItemType Directory -Force -Path $redirectOut | Out-Null
        Get-ChildItem $redirectOut -Force | Remove-Item -Recurse -Force
        $redirectConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Yeni adrese yonlendir" stopProcessing="true">
          <match url="(.*)" />
          <action type="Redirect" url="https://$SiteDomain/{R:1}" redirectType="Permanent" appendQueryString="true" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
"@
        [IO.File]::WriteAllText((Join-Path $redirectOut 'web.config'), $redirectConfig, (New-Object Text.UTF8Encoding($false)))
        Publish-Folder $script:profiles['frontend'] $redirectOut -AllowDelete
        # PowerShell 5.1 yönlendirmeyi güvenilir okuyamaz; curl.exe ile başlık okunur.
        $location = ((& (Join-Path $env:SystemRoot 'System32\curl.exe') -sS -I --max-time 60 "https://$FrontendHost/giris-yap?x=1") |
            Where-Object { $_ -match '^(?i)location:' } | Select-Object -First 1) -replace '^(?i)location:\s*', ''
        $location = ([string]$location).Trim()
        if ($location -ne "https://$SiteDomain/giris-yap?x=1") { throw "Yönlendirme beklenen adrese gitmiyor: '$location'" }
        Write-Host "  $FrontendHost -> $location (301)" -ForegroundColor Green
    }
    else {
        Write-Step "$step/$total Frontend -> $FrontendHost"
        # Frontend sitesinde korunacak dosya yok (görseller backend'de): fazla dosyalar silinir.
        Publish-Folder $script:profiles['frontend'] $frontendOut -AllowDelete
        $page = Invoke-WebRequest "https://$FrontendHost/" -UseBasicParsing -TimeoutSec 60
        if ($page.StatusCode -ne 200) { throw "Frontend $($page.StatusCode) döndü." }
        Write-Host "  $FrontendHost yanıt veriyor (200)" -ForegroundColor Green
    }

    Write-Host "`nYayın tamamlandı." -ForegroundColor Green
    if ($siteZip -and ($SkipCpanel -or -not $cpanelOk)) {
        Write-Host ("`nSON ADIM: $siteZip dosyasını cPanel > Dosya Yöneticisi ile $SiteDomain " +
                    "klasörüne yükleyip 'Extract' ile açın. Ardından https://$SiteDomain adresini kontrol edin.") -ForegroundColor Yellow
    }
}
finally {
    if (-not $SkipDeploy) {
        # Bu klasörlerdeki web.config'ler sırları AÇIK METİN taşır.
        foreach ($dir in $primaryOut, $backupOut, $backup2Out) {
            if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
        }
    }
}
