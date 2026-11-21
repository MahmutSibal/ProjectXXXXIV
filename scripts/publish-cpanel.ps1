<#
.SYNOPSIS
    Derlenmiş frontend'i (frontend\dist) cPanel'deki alan adı klasörüne cPanel API (HTTPS) ile yükler.

.DESCRIPTION
    Neden FTP değil: hostingin FTP sunucusu TLS desteklemiyor (AUTH TLS reddediliyor), SSH/SFTP
    de kapalı. Şifresiz FTP'de şifre ve dosyalar internette açık gider. cPanel API ise HTTPS'tir.

    - Kimlik: cPanel kullanıcı adı + API token (cPanel > Güvenlik > Manage API Tokens).
      İlk çalıştırmada sorulur ve Windows'un kullanıcıya özel şifrelemesiyle (DPAPI)
      $HOME\.sukran\ altında saklanır; repoya yazılmaz, başka kullanıcı/bilgisayar çözemez.
      Token komut satırında görünmesin diye curl'e geçici bir yapılandırma dosyasıyla verilir.
    - Hedef klasör cPanel'den okunur (alan adının belge kök dizini). public_html ya da ev dizini
      çıkarsa betik DURUR: başka bir sitenin üzerine yazılmaz.
    - Site tek bir zip olarak gönderilir ve sunucuda açılır; ardından assets\ altındaki, yeni
      sürümde olmayan eski dosyalar silinir. web.config gönderilmez (yalnızca IIS içindir).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\publish-cpanel.ps1
.EXAMPLE
    # Kayıtlı token'ı değiştirmek için
    powershell -ExecutionPolicy Bypass -File scripts\publish-cpanel.ps1 -ResetCredential
#>
[CmdletBinding()]
param(
    [string]$SourceDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'frontend\dist'),
    [string]$SiteDomain = 'sukranapp.com',
    # Hesabın bulunduğu cPanel sunucusu (geçerli sertifikalı bir ad) ve portu.
    [string]$CpanelUrl = 'https://welltechub.com:2083',
    [string]$CredentialPath = (Join-Path $HOME ".sukran\cpanel-api-$SiteDomain.xml"),
    [switch]$ResetCredential,
    # Yalnızca yerel testler için: güvenilecek ek kök sertifika (PEM).
    [string]$CaCertPath
)

$ErrorActionPreference = 'Stop'
$curl = Join-Path $env:SystemRoot 'System32\curl.exe'
if (-not (Test-Path $curl)) { throw 'curl.exe bulunamadı (Windows 10 ve sonrasında yerleşik gelir).' }
if (-not (Test-Path (Join-Path $SourceDir 'index.html'))) {
    throw "Derlenmiş site bulunamadı: $SourceDir\index.html. Önce frontend derlenmeli."
}
$CpanelUrl = $CpanelUrl.TrimEnd('/')

# --- Kimlik bilgisi ------------------------------------------------------------
if ($ResetCredential -and (Test-Path $CredentialPath)) { Remove-Item $CredentialPath -Force }
if (Test-Path $CredentialPath) {
    $credential = Import-Clixml $CredentialPath
}
else {
    Write-Host "cPanel API bilgisi bir kez sorulacak ve bu bilgisayarda şifreli saklanacak." -ForegroundColor Yellow
    Write-Host "  Kullanıcı adı: cPanel kullanıcı adınız (ör. welltech)" -ForegroundColor Yellow
    Write-Host "  Şifre        : cPanel > Güvenlik > Manage API Tokens ile oluşturduğunuz token" -ForegroundColor Yellow
    $credential = Get-Credential -Message "cPanel API ($SiteDomain): kullanıcı adı + API token"
    if (-not $credential) { throw 'cPanel bilgisi girilmedi.' }
    New-Item -ItemType Directory -Force -Path (Split-Path $CredentialPath) | Out-Null
    $credential | Export-Clixml $CredentialPath
}
$net = $credential.GetNetworkCredential()
$user = $net.UserName

# Token'ı komut satırına yazmamak için curl yapılandırma dosyası (iş bitince silinir).
$curlConfig = Join-Path $env:TEMP ("sukran-cpanel-" + [guid]::NewGuid().ToString('N') + '.cfg')
[IO.File]::WriteAllText($curlConfig, "header = `"Authorization: cpanel ${user}:$($net.Password)`"`n", (New-Object Text.UTF8Encoding($false)))

function Invoke-Cpanel([string]$path, [string[]]$extra = @()) {
    $curlArgs = @('-sS', '--fail-with-body', '--max-time', '300', '-K', $curlConfig)
    if ($CaCertPath) { $curlArgs += @('--cacert', $CaCertPath) }
    # PowerShell 5.1, 'Stop' modunda curl'ün stderr'ini anında hata sayar; çıkış kodu aşağıda denetlenir.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $out = & $curl @curlArgs @extra "$CpanelUrl$path" 2>&1 }
    finally { $ErrorActionPreference = $previous }
    if ($LASTEXITCODE -ne 0) {
        $text = ($out | Out-String).Trim()
        if ($text -match '401|Access denied|Unauthorized') { $text = 'Kimlik doğrulanamadı: kullanıcı adı ya da API token yanlış (-ResetCredential ile yeniden girin).' }
        throw "cPanel isteği başarısız ($path): $text"
    }
    try { return (($out | Out-String) | ConvertFrom-Json) }
    catch { throw "cPanel beklenmeyen yanıt döndü ($path): $(($out | Out-String).Substring(0, [Math]::Min(200, ($out | Out-String).Length)))" }
}

function Assert-Uapi($result, [string]$what) {
    if (-not $result.status) { throw "$what başarısız: $(@($result.errors) -join ' ')" }
    return $result.data
}

function Invoke-Api2([string]$module, [string]$func, [hashtable]$params) {
    $query = @("cpanel_jsonapi_user=$([Uri]::EscapeDataString($user))", 'cpanel_jsonapi_apiversion=2',
               "cpanel_jsonapi_module=$module", "cpanel_jsonapi_func=$func")
    foreach ($k in $params.Keys) { $query += "$k=$([Uri]::EscapeDataString([string]$params[$k]))" }
    $r = Invoke-Cpanel ("/json-api/cpanel?" + ($query -join '&'))
    $res = $r.cpanelresult
    if ($res.error -or ($res.event -and -not $res.event.result)) { throw "$module::$func başarısız: $($res.error)" }
    foreach ($row in @($res.data)) { if ($row -and $row.PSObject.Properties['result'] -and -not $row.result) { throw "$module::$func başarısız: $($row.reason)" } }
    return $res.data
}

$zip = $null
try {
    # --- Hedef klasör ---------------------------------------------------------------
    Write-Host "  cPanel: $CpanelUrl ($user)"
    $info = Assert-Uapi (Invoke-Cpanel "/execute/DomainInfo/single_domain_data?domain=$([Uri]::EscapeDataString($SiteDomain))") 'Alan adı bilgisi'
    $docroot = ([string]$info.documentroot).TrimEnd('/')
    $homeDir = ([string]$info.homedir).TrimEnd('/')
    if (-not $docroot) { throw "$SiteDomain için belge kök dizini okunamadı." }
    if ($docroot -match '/public_html$' -or ($homeDir -and $docroot -eq $homeDir)) {
        throw "$SiteDomain belge kök dizini '$docroot': başka bir sitenin klasörü olabilir, yükleme durduruldu."
    }
    Write-Host "  Hedef klasör: $docroot"

    # --- Paket ------------------------------------------------------------------------
    Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
    $zipName = "sukran-yayin-$([guid]::NewGuid().ToString('N').Substring(0, 8)).zip"
    $zip = Join-Path $env:TEMP $zipName
    $base = (Resolve-Path $SourceDir).Path.TrimEnd('\') + '\'
    $archive = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
    $assetNames = New-Object System.Collections.Generic.List[string]
    try {
        Get-ChildItem $SourceDir -Recurse -File -Force | Where-Object { $_.Name -ne 'web.config' } | ForEach-Object {
            $entry = $_.FullName.Substring($base.Length).Replace('\', '/')
            if ($entry -like 'assets/*' -and $entry -notlike 'assets/*/*') { $assetNames.Add(($entry -split '/')[-1]) }
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $entry, 'Optimal')
        }
    }
    finally { $archive.Dispose() }

    # --- Gönder ve aç --------------------------------------------------------------------
    Write-Host "  Paket gönderiliyor ($([Math]::Round((Get-Item $zip).Length / 1MB, 1)) MB)..."
    $up = Invoke-Cpanel '/execute/Fileman/upload_files' @('-F', "dir=$docroot", '-F', 'overwrite=1', '-F', "file-1=@$zip")
    [void](Assert-Uapi $up 'Yükleme')

    $remoteZip = "$docroot/$zipName"
    try {
        [void](Invoke-Api2 'Fileman' 'fileop' @{ op = 'extract'; sourcefiles = $remoteZip; destfiles = $docroot; doubledecode = '0' })
    }
    finally {
        try { [void](Invoke-Api2 'Fileman' 'fileop' @{ op = 'unlink'; sourcefiles = $remoteZip; doubledecode = '0' }) } catch { }
    }
    Write-Host "  Site açıldı." -ForegroundColor Green

    # Eski sürümün js/css dosyaları (adları her derlemede değişir) birikmesin.
    $listing = Assert-Uapi (Invoke-Cpanel "/execute/Fileman/list_files?dir=$([Uri]::EscapeDataString("$docroot/assets"))&types=file") 'Klasör listesi'
    $stale = @($listing | ForEach-Object { [string]$_.file } |
        Where-Object { $_ -and $_ -notin $assetNames -and $_ -match '\.(js|css|map|png|jpg|jpeg|svg|webp|woff2?)$' })
    if ($stale.Count) {
        $paths = ($stale | ForEach-Object { "$docroot/assets/$_" }) -join ','
        try {
            [void](Invoke-Api2 'Fileman' 'fileop' @{ op = 'unlink'; sourcefiles = $paths; doubledecode = '0' })
            Write-Host "  Eski sürümden $($stale.Count) dosya temizlendi."
        }
        catch { Write-Host "  Eski dosyalar silinemedi (site etkilenmez): $($_.Exception.Message)" -ForegroundColor Yellow }
    }
}
finally {
    Remove-Item $curlConfig -Force -ErrorAction SilentlyContinue
    if ($zip) { Remove-Item $zip -Force -ErrorAction SilentlyContinue }
}

# --- Doğrulama -------------------------------------------------------------------------------
$expected = [regex]::Match((Get-Content (Join-Path $SourceDir 'index.html') -Raw), 'assets/index-[^"]+\.js').Value
$checkArgs = @('-sS', '--max-time', '60')
if ($CaCertPath) { $checkArgs += @('--cacert', $CaCertPath) }
$live = (& $curl @checkArgs "https://$SiteDomain/?v=$([guid]::NewGuid().ToString('N'))") | Out-String
if ($expected -and $live -notmatch [regex]::Escape($expected)) {
    throw "Yükleme bitti ama https://$SiteDomain eski sürümü gösteriyor (beklenen $expected)."
}
Write-Host "  https://$SiteDomain yeni sürümü gösteriyor." -ForegroundColor Green
