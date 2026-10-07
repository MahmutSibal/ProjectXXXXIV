<#
.SYNOPSIS
    WhatsApp doğrulama servisini MonsterASP'a yüklenmeye hazır hâle getirir.

.DESCRIPTION
    Servis Node.js'tir; MonsterASP bunu httpPlatformHandler ile çalıştırır.
    Betik yayın klasörünü kurar, bağımlılıkları üretim modunda yükler ve
    web.config'e servis jetonunu yerleştirir.

    Jeton depoya YAZILMAZ; bu oturumun ortam değişkeninden okunur.

.EXAMPLE
    $env:WHATSAPP_SERVICE_TOKEN = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
    .\scripts\publish-whatsapp.ps1
#>
[CmdletBinding()]
param(
    [string]$OutputPath = (Join-Path $PSScriptRoot "..\publish-whatsapp")
)

$ErrorActionPreference = 'Stop'

$serviceDir = Join-Path $PSScriptRoot "..\services\whatsapp"
if (-not (Test-Path $serviceDir)) { throw "Servis klasörü bulunamadı: $serviceDir" }

$token = [Environment]::GetEnvironmentVariable('WHATSAPP_SERVICE_TOKEN')

if ([string]::IsNullOrWhiteSpace($token)) {
    throw "WHATSAPP_SERVICE_TOKEN tanımlı değil.`nÜretmek için:`n" +
          '  $env:WHATSAPP_SERVICE_TOKEN = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))'
}

# Servis de aynı kontrolü yapıp başlamayı reddediyor; burada durmak, sunucuda
# "neden açılmıyor" diye uğraşmaktan ucuz.
if ($token.Length -lt 24) {
    throw "WHATSAPP_SERVICE_TOKEN çok kısa ($($token.Length) karakter). En az 24 olmalı — " +
          "servis internete açık çalıştığında WhatsApp hattınızı koruyan tek engel budur."
}

# --- Bağımlılıklar ---------------------------------------------------------
Write-Host "Bağımlılıklar yükleniyor (yalnızca üretim)..." -ForegroundColor Cyan
Push-Location $serviceDir
try {
    & npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install başarısız (çıkış kodu $LASTEXITCODE)." }
} finally {
    Pop-Location
}

# --- Yayın klasörü ---------------------------------------------------------
if (Test-Path $OutputPath) {
    $resolved = (Resolve-Path $OutputPath).Path
    Write-Host "Var olan yayın klasörü temizleniyor: $resolved"
    Get-ChildItem -Path $resolved -Force | Remove-Item -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

$OutputPath = (Resolve-Path $OutputPath).Path

# tokens/ KOPYALANMAZ: WhatsApp oturum kimliğidir, sunucuda QR okutularak oluşur.
# Yerelden taşımak, aynı oturumun iki yerde açılmasına ve bağlantının sürekli
# düşmesine yol açar.
foreach ($item in @('server.js', 'package.json', 'package-lock.json')) {
    $source = Join-Path $serviceDir $item
    if (Test-Path $source) { Copy-Item $source -Destination $OutputPath }
}

Copy-Item (Join-Path $serviceDir 'node_modules') -Destination $OutputPath -Recurse

# --- web.config ------------------------------------------------------------
$template = Get-Content (Join-Path $serviceDir 'web.config.template') -Raw
$template.Replace('__WHATSAPP_SERVICE_TOKEN__', $token) |
    Set-Content -Path (Join-Path $OutputPath 'web.config') -Encoding UTF8

# --- Özet ------------------------------------------------------------------
$dosyaSayisi = (Get-ChildItem $OutputPath -Recurse -File | Measure-Object).Count
$boyutMb = [math]::Round((Get-ChildItem $OutputPath -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 1)

Write-Host ""
Write-Host "Yayın hazır: $OutputPath" -ForegroundColor Green
Write-Host "  $dosyaSayisi dosya, $boyutMb MB"
Write-Host "  web.config'e jeton yerleştirildi (********)"
Write-Host ""
Write-Host "Sonraki adımlar:" -ForegroundColor Yellow
Write-Host "  1. Bu klasörün İÇERİĞİNİ WhatsApp sitesinin wwwroot'una yükleyin"
Write-Host "  2. Backend'de SUKRAN_WHATSAPP_TOKEN'ı AYNI değere ayarlayıp yeniden yayınlayın"
Write-Host "  3. SuperAdmin > WhatsApp ekranından QR okutun"
