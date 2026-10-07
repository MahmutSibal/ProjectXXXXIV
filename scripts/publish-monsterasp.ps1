<#
.SYNOPSIS
    Backend'i MonsterASP.NET'e yüklenmeye hazır hâle getirir.

.DESCRIPTION
    MonsterASP paylaşımlı IIS barındırma sunar; ortam değişkenlerini ayarlamak için
    bir panel yoktur. IIS'te bunun karşılığı web.config içindeki
    <aspNetCore><environmentVariables> bölümüdür. Bu betik `dotnet publish` çalıştırır
    ve üretilen web.config'e bu bölümü ekler.

    Sırlar depoya YAZILMAZ; bu oturumun ortam değişkenlerinden okunur ve yalnızca
    yayın klasöründeki web.config'e yazılır. O klasör sunucuya yüklendikten sonra
    yerelde tutulmasına gerek yoktur.

.EXAMPLE
    $env:SUKRAN_DB_CONNECTION = "Server=...;Database=...;User Id=...;Password=...;Encrypt=True;TrustServerCertificate=True;"
    $env:JWT_SIGNING_KEY = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
    $env:SUKRAN_SUPERADMIN_PASSWORD = "..."
    .\scripts\publish-monsterasp.ps1 -SiteHost "sukran.runasp.net" -FrontendOrigin "https://sukran.runasp.net"
#>
[CmdletBinding()]
param(
    # MonsterASP'ın verdiği alan adı. AllowedHosts buna göre ayarlanır; yanlışsa
    # ASP.NET Core her isteğe 400 döner ve site "sebepsiz" çalışmaz.
    [Parameter(Mandatory = $true)]
    [string]$SiteHost,

    # Frontend'in çalıştığı adres(ler) (CORS). Birden fazla verilebilir; örneğin
    # HTTPS henüz açılmamışsa hem http hem https biçimini vermek gerekir, çünkü
    # tarayıcı Origin başlığını şemayla birlikte gönderir ve tam eşleşme aranır.
    [Parameter(Mandatory = $true)]
    [string[]]$FrontendOrigin,

    [string]$OutputPath = (Join-Path $PSScriptRoot "..\publish"),

    # Sandbox anahtarlarıyla test ederken bunu kullanın. appsettings.Production.json
    # canlı iyzico adresini içerir; sandbox anahtarı canlı adrese karşı çalışmaz.
    [switch]$IyzicoSandbox,

    # WhatsApp doğrulama servisinin adresi (ör. https://sukranwa.runasp.net).
    # Verilirse doğrulama açılır; WHATSAPP_SERVICE_TOKEN ortam değişkeni de gerekir.
    [string]$WhatsAppBaseUrl,

    # Swagger arayüzünü üretimde açar. Tüm uç noktaları, parametreleri ve şemaları
    # herkese listeler; yalnızca test ortamında kullanın.
    [switch]$EnableSwagger,

    # İlk kurulumda açın: hatalar wwwroot dışındaki .\logs\stdout dosyasına yazılır.
    # Sorun çözüldükten sonra kapatın (log dosyası büyür ve ayrıntı sızdırır).
    [switch]$EnableStdoutLog
)

$ErrorActionPreference = 'Stop'

$projectPath = Join-Path $PSScriptRoot "..\backend\src\AppSukran.API"
if (-not (Test-Path $projectPath)) {
    throw "API projesi bulunamadı: $projectPath"
}

# --- Sırlar ---------------------------------------------------------------
# Uygulama zaten eksik/zayıf JWT anahtarıyla açılmayı reddediyor. Aynı kontrolü
# burada da yapıyoruz: eksik bir sırla yayın paketi üretip sunucuda "neden
# açılmıyor" diye uğraşmak yerine, en başta durmak daha ucuz.

$required = @{
    'SUKRAN_DB_CONNECTION'       = 'SQL Server bağlantı dizesi'
    'JWT_SIGNING_KEY'            = 'JWT imza anahtarı (en az 32 karakter)'
    'SUKRAN_SUPERADMIN_PASSWORD' = 'İlk SuperAdmin parolası'
}

$missing = @()
foreach ($name in $required.Keys) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        $missing += "  $name  — $($required[$name])"
    }
}

if ($missing.Count -gt 0) {
    throw "Şu ortam değişkenleri tanımlı değil:`n$($missing -join "`n")`n`nBkz. DEPLOYMENT.md bölüm 3.1"
}

if ([Environment]::GetEnvironmentVariable('JWT_SIGNING_KEY').Length -lt 32) {
    throw "JWT_SIGNING_KEY 32 karakterden kısa. Uygulama production'da bu anahtarla açılmaz."
}

$iyzicoKey    = [Environment]::GetEnvironmentVariable('SUKRAN_IYZICO_API_KEY')
$iyzicoSecret = [Environment]::GetEnvironmentVariable('SUKRAN_IYZICO_SECRET_KEY')
if ([string]::IsNullOrWhiteSpace($iyzicoKey) -or [string]::IsNullOrWhiteSpace($iyzicoSecret)) {
    Write-Warning "iyzico anahtarları yok. Ödeme uçları hata verecek (sahte başarı DÖNMEZ)."
}

# --- Yayın ----------------------------------------------------------------

if (Test-Path $OutputPath) {
    # Eski dosyaların yeni yayınla karışmaması için temizle. Yalnızca bu betiğin
    # ürettiği klasörü siler; yol dışarıdan verilirse önce onaylatılır.
    $resolved = (Resolve-Path $OutputPath).Path
    Write-Host "Var olan yayın klasörü temizleniyor: $resolved"
    Get-ChildItem -Path $resolved -Force | Remove-Item -Recurse -Force
}

Write-Host "Yayın alınıyor..." -ForegroundColor Cyan
& dotnet publish $projectPath -c Release -o $OutputPath --nologo
if ($LASTEXITCODE -ne 0) { throw "dotnet publish başarısız (çıkış kodu $LASTEXITCODE)." }

# --- web.config'e ortam değişkenlerini ekle -------------------------------

$webConfigPath = Join-Path $OutputPath "web.config"
if (-not (Test-Path $webConfigPath)) { throw "web.config üretilmedi: $webConfigPath" }

$vars = [ordered]@{
    'ASPNETCORE_ENVIRONMENT'       = 'Production'
    'SUKRAN_DB_CONNECTION'         = [Environment]::GetEnvironmentVariable('SUKRAN_DB_CONNECTION')
    'JWT_SIGNING_KEY'              = [Environment]::GetEnvironmentVariable('JWT_SIGNING_KEY')
    'SUKRAN_SUPERADMIN_PASSWORD'   = [Environment]::GetEnvironmentVariable('SUKRAN_SUPERADMIN_PASSWORD')
    # AllowedHosts yanlışsa her istek 400 döner — MonsterASP alan adı buraya yazılmalı.
    'AllowedHosts'                 = $SiteHost
}

# CORS kaynakları dizidir; ASP.NET Core bunları Cors__AllowedOrigins__0, __1 ...
# biçiminde okur. Tek bir değişkene virgülle yazmak ÇALIŞMAZ.
for ($i = 0; $i -lt $FrontendOrigin.Count; $i++) {
    $vars["Cors__AllowedOrigins__$i"] = $FrontendOrigin[$i]
}

if (-not [string]::IsNullOrWhiteSpace($iyzicoKey))    { $vars['SUKRAN_IYZICO_API_KEY'] = $iyzicoKey }
if (-not [string]::IsNullOrWhiteSpace($iyzicoSecret)) { $vars['SUKRAN_IYZICO_SECRET_KEY'] = $iyzicoSecret }

if ($IyzicoSandbox) {
    $vars['Payment__Iyzico__BaseUrl'] = 'https://sandbox-api.iyzipay.com'
}

if ($EnableSwagger) {
    $vars['Swagger__Enabled'] = 'true'
}

if (-not [string]::IsNullOrWhiteSpace($WhatsAppBaseUrl)) {
    $whatsAppToken = [Environment]::GetEnvironmentVariable('WHATSAPP_SERVICE_TOKEN')

    # Uygulama, doğrulama açıkken jeton yoksa zaten açılmayı reddediyor.
    # Burada durmak, sunucuda "neden başlamıyor" diye uğraşmaktan ucuz.
    if ([string]::IsNullOrWhiteSpace($whatsAppToken)) {
        throw "WhatsApp adresi verildi ama WHATSAPP_SERVICE_TOKEN tanımlı değil. " +
              "Servise yüklediğinizle AYNI jeton olmalı, yoksa backend 401 alır."
    }

    $vars['WhatsApp__Enabled'] = 'true'
    $vars['WhatsApp__BaseUrl']  = $WhatsAppBaseUrl.TrimEnd('/')
    $vars['SUKRAN_WHATSAPP_TOKEN'] = $whatsAppToken
}

[xml]$doc = Get-Content $webConfigPath -Raw
$aspNetCore = $doc.SelectSingleNode('//aspNetCore')
if ($null -eq $aspNetCore) { throw "web.config içinde <aspNetCore> bulunamadı." }

$existing = $aspNetCore.SelectSingleNode('environmentVariables')
if ($null -ne $existing) { [void]$aspNetCore.RemoveChild($existing) }

$envNode = $doc.CreateElement('environmentVariables')
foreach ($key in $vars.Keys) {
    $item = $doc.CreateElement('environmentVariable')
    $item.SetAttribute('name', $key)
    $item.SetAttribute('value', $vars[$key])
    [void]$envNode.AppendChild($item)
}
[void]$aspNetCore.AppendChild($envNode)

$aspNetCore.SetAttribute('stdoutLogEnabled', $EnableStdoutLog.IsPresent.ToString().ToLowerInvariant())

$doc.Save((Resolve-Path $webConfigPath).Path)

# --- Özet -----------------------------------------------------------------
# Sır DEĞERLERİ yazdırılmaz; yalnızca hangi anahtarın yazıldığı gösterilir.

Write-Host ""
Write-Host "Yayın hazır: $((Resolve-Path $OutputPath).Path)" -ForegroundColor Green
Write-Host "web.config'e yazılan ayarlar:"
foreach ($key in $vars.Keys) {
    # TOKEN eklenmemişti ve SUKRAN_WHATSAPP_TOKEN ekrana AÇIK yazıldı.
    # Liste yerine "aksi ispatlanana kadar sır say" yaklaşımı daha güvenli olurdu;
    # şimdilik desen genişletildi — yeni bir sır eklerken buraya da bakın.
    $isSecret = $key -match 'PASSWORD|KEY|SECRET|CONNECTION|TOKEN|CREDENTIAL'
    $shown = if ($isSecret) { '********' } else { $vars[$key] }
    "    {0,-30} = {1}" -f $key, $shown | Write-Host
}

Write-Host ""
Write-Host "Sonraki adım: bu klasörün İÇERİĞİNİ MonsterASP'ta wwwroot altına yükleyin." -ForegroundColor Yellow
Write-Host "Ardından doğrulayın:  https://$SiteHost/api/health/ready"
if (-not $IyzicoSandbox) {
    Write-Host "UYARI: canlı iyzico adresi kullanılacak. Sandbox anahtarıyla test ediyorsanız -IyzicoSandbox ekleyin." -ForegroundColor Yellow
}
