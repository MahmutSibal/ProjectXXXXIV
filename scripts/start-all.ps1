<#
.SYNOPSIS
    Şükran App'in üç servisini birden başlatır: backend, frontend ve WhatsApp.

.DESCRIPTION
    Her servis ayrı bir arka plan süreci olarak çalışır; çıktıları logs/ altına yazılır.
    Betik, servisler gerçekten yanıt verene kadar bekler ve durumu özetler —
    "başlattım" deyip geçmez, ayakta olduklarını doğrular.

.PARAMETER Stop
    Çalışan servisleri durdurur.

.PARAMETER Status
    Yalnızca durum gösterir, bir şey başlatmaz.

.PARAMETER SkipWhatsApp
    WhatsApp servisini başlatmaz (Chromium açtığı için ağır; her zaman gerekmez).

.EXAMPLE
    .\start-all.ps1

.EXAMPLE
    .\start-all.ps1 -Stop

.EXAMPLE
    .\start-all.ps1 -SkipWhatsApp
#>
param(
    [switch]$Stop,
    [switch]$Status,
    [switch]$SkipWhatsApp
)

$ErrorActionPreference = "Stop"

$Root       = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "backend\src\AppSukran.API"
$FrontendDir= Join-Path $Root "frontend"
$WhatsAppDir= Join-Path $Root "services\whatsapp"
$LogDir     = Join-Path $Root "logs"

$BackendPort  = 5021
$FrontendPort = 5173
$WhatsAppPort = 5055

# PowerShell'de "npm" çoğu kurulumda npm.ps1'e çözümlenir; Start-Process ne .ps1
# ne de .cmd dosyasını doğrudan çalıştırabilir ("%1 geçerli bir Win32 uygulaması
# değil"). Bu yüzden AÇIKÇA npm.cmd aranır ve cmd.exe üzerinden çalıştırılır.
function Resolve-NpmCmd {
    $candidates = @()

    $command = Get-Command npm -ErrorAction SilentlyContinue
    if ($command -and $command.Source) {
        # npm.ps1 -> aynı klasördeki npm.cmd
        $candidates += (Join-Path (Split-Path $command.Source -Parent) "npm.cmd")
    }

    $candidates += "$env:ProgramFiles\nodejs\npm.cmd"
    $candidates += "$env:APPDATA\npm\npm.cmd"

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) { return $candidate }
    }
    return $null
}

function Write-Step([string]$Message) { Write-Host "  $Message" -ForegroundColor Cyan }
function Write-Ok  ([string]$Message) { Write-Host "  [OK]   $Message" -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host "  [!]    $Message" -ForegroundColor Yellow }
function Write-Err ([string]$Message) { Write-Host "  [HATA] $Message" -ForegroundColor Red }

function Get-PortOwner([int]$Port) {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
                  Select-Object -First 1
    if (-not $connection) { return $null }
    return Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
}

function Test-Endpoint([string]$Url, [hashtable]$Headers = @{}) {
    try {
        Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing -Headers $Headers | Out-Null
        return $true
    }
    catch {
        # 4xx/5xx de "ayakta" sayılır; bağlantı kurulabiliyorsa servis çalışıyordur.
        return $null -ne $_.Exception.Response
    }
}

function Wait-Until([scriptblock]$Check, [int]$TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (& $Check) { return $true }
        Start-Sleep -Milliseconds 1500
    }
    return $false
}

function Start-Service_(
    [string]$Name, [string]$WorkingDirectory, [string]$FilePath,
    [string[]]$ArgumentList, [int]$Port, [scriptblock]$ReadyCheck,
    [int]$TimeoutSeconds = 90
) {
    $existing = Get-PortOwner $Port
    if ($existing) {
        Write-Ok "$Name zaten çalışıyor (port $Port, PID $($existing.Id))"
        return $true
    }

    Write-Step "$Name başlatılıyor..."

    $outLog = Join-Path $LogDir "$Name.log"
    $errLog = Join-Path $LogDir "$Name.err.log"

    Start-Process -FilePath $FilePath -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory -WindowStyle Hidden `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog | Out-Null

    if (Wait-Until $ReadyCheck $TimeoutSeconds) {
        $process = Get-PortOwner $Port
        Write-Ok "$Name hazır (port $Port$(if ($process) { ", PID $($process.Id)" }))"
        return $true
    }

    Write-Err "$Name $TimeoutSeconds saniyede yanıt vermedi. Log: $outLog"
    if (Test-Path $errLog) {
        $tail = Get-Content $errLog -Tail 5 -ErrorAction SilentlyContinue
        if ($tail) { $tail | ForEach-Object { Write-Host "         $_" -ForegroundColor DarkGray } }
    }
    return $false
}

function Stop-ByPort([string]$Name, [int]$Port) {
    $process = Get-PortOwner $Port
    if (-not $process) { Write-Warn "$Name zaten kapalı"; return }
    Stop-Process -Id $process.Id -Force
    Write-Ok "$Name durduruldu (PID $($process.Id))"
}

function Get-WhatsAppToken {
    $envFile = Join-Path $WhatsAppDir ".env"
    if (-not (Test-Path $envFile)) { return $null }

    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*WHATSAPP_SERVICE_TOKEN\s*=\s*(.+?)\s*$') {
            return $Matches[1]
        }
    }
    return $null
}

function Show-Status {
    Write-Host ""
    Write-Host "  DURUM" -ForegroundColor White
    Write-Host "  -----" -ForegroundColor DarkGray

    $items = @(
        @{ Name = "Backend ";  Port = $BackendPort;  Url = "http://localhost:$BackendPort/api/phone-verification/status" },
        @{ Name = "Frontend";  Port = $FrontendPort; Url = "http://localhost:$FrontendPort" },
        @{ Name = "WhatsApp";  Port = $WhatsAppPort; Url = $null }
    )

    foreach ($item in $items) {
        $process = Get-PortOwner $item.Port
        if ($process) {
            Write-Host "  $($item.Name)  : " -NoNewline
            Write-Host "calisiyor" -ForegroundColor Green -NoNewline
            Write-Host " (port $($item.Port), PID $($process.Id))"
        }
        else {
            Write-Host "  $($item.Name)  : " -NoNewline
            Write-Host "kapali" -ForegroundColor DarkGray
        }
    }

    # WhatsApp oturumu bağlı mı? Süreç ayakta olsa da QR okutulmamış olabilir.
    $token = Get-WhatsAppToken
    if ($token -and (Get-PortOwner $WhatsAppPort)) {
        try {
            $wa = Invoke-RestMethod -Uri "http://127.0.0.1:$WhatsAppPort/status" `
                    -Headers @{ "x-service-token" = $token } -TimeoutSec 5
            $color = if ($wa.status -eq 'connected') { "Green" } else { "Yellow" }
            Write-Host "  WhatsApp oturumu: " -NoNewline
            Write-Host $wa.status -ForegroundColor $color -NoNewline
            if ($wa.status -eq 'qr') {
                Write-Host " -> SuperAdmin > WhatsApp sayfasindan QR okutun"
            }
            else { Write-Host "" }
        }
        catch { Write-Warn "WhatsApp durumu okunamadi: $($_.Exception.Message)" }
    }

    Write-Host ""
    Write-Host "  Adresler:" -ForegroundColor White
    Write-Host "    Panel   : http://localhost:$FrontendPort"
    Write-Host "    API     : http://localhost:$BackendPort"
    Write-Host "    Swagger : http://localhost:$BackendPort/swagger"
    Write-Host ""
}

# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "  SUKRAN APP" -ForegroundColor White

if ($Stop) {
    Write-Host "  Servisler durduruluyor..." -ForegroundColor DarkGray
    Write-Host ""
    Stop-ByPort "Frontend" $FrontendPort
    Stop-ByPort "Backend"  $BackendPort
    Stop-ByPort "WhatsApp" $WhatsAppPort
    Write-Host ""
    exit 0
}

if ($Status) { Show-Status; exit 0 }

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Write-Host ""

# --- Ön kontroller: eksik bağımlılıkla başlatıp anlamsız hata almayalım -----
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Warn "frontend/node_modules yok. 'npm install' calistiriliyor..."
    Push-Location $FrontendDir
    & (Resolve-NpmCmd) install --no-audit --no-fund | Out-Null
    Pop-Location
}

$whatsAppToken = Get-WhatsAppToken

if (-not $SkipWhatsApp) {
    if (-not (Test-Path (Join-Path $WhatsAppDir "node_modules"))) {
        Write-Warn "services/whatsapp/node_modules yok. 'npm install' calistiriliyor (Chromium indirir)..."
        Push-Location $WhatsAppDir
        & (Resolve-NpmCmd) install --no-audit --no-fund | Out-Null
        Pop-Location
    }

    if (-not $whatsAppToken) {
        Write-Err "services/whatsapp/.env icinde WHATSAPP_SERVICE_TOKEN yok."
        Write-Host "         Servis, jetonsuz baslamaz (bkz. DEPLOYMENT.md). Ornek:" -ForegroundColor DarkGray
        Write-Host "         WHATSAPP_SERVICE_TOKEN=<rastgele-uzun-deger>" -ForegroundColor DarkGray
        $SkipWhatsApp = $true
    }
}

# --- Backend ---------------------------------------------------------------
$backendOk = Start-Service_ -Name "backend" -WorkingDirectory $Root `
    -FilePath "dotnet" -ArgumentList @("run", "--project", $BackendDir) `
    -Port $BackendPort `
    -ReadyCheck { Test-Endpoint "http://localhost:$BackendPort/api/phone-verification/status" } `
    -TimeoutSeconds 120

# --- Frontend --------------------------------------------------------------
if (-not (Resolve-NpmCmd)) { Write-Err "npm.cmd bulunamadi. Node.js kurulu mu?"; exit 1 }

# cmd.exe üzerinden çalıştırılır (toplu iş dosyası doğrudan başlatılamıyor).
# npm'in MUTLAK yolunu vermek yerine çalışma dizinini frontend yapıp PATH'ten
# çözdürüyoruz: "C:\Program Files\..." içindeki boşluk, cmd.exe'nin tırnak
# kurallarıyla birleşince komutu ikiye bölüyordu ('C:\Program' bulunamadı).
$frontendOk = Start-Service_ -Name "frontend" -WorkingDirectory $FrontendDir `
    -FilePath "cmd.exe" -ArgumentList @("/c", "npm", "run", "dev") `
    -Port $FrontendPort `
    -ReadyCheck { Test-Endpoint "http://localhost:$FrontendPort" } `
    -TimeoutSeconds 90

# --- WhatsApp --------------------------------------------------------------
$whatsAppOk = $true
if (-not $SkipWhatsApp) {
    # Jeton, sürece ortam değişkeni olarak geçer; komut satırına yazılmaz
    # (komut satırı görev yöneticisinde başka kullanıcılara görünebilir).
    $env:WHATSAPP_SERVICE_TOKEN = $whatsAppToken

    $whatsAppOk = Start-Service_ -Name "whatsapp" -WorkingDirectory $WhatsAppDir `
        -FilePath "node" -ArgumentList @("server.js") `
        -Port $WhatsAppPort `
        -ReadyCheck { Test-Endpoint "http://127.0.0.1:$WhatsAppPort/status" } `
        -TimeoutSeconds 90
}
else {
    Write-Warn "WhatsApp atlandi"
}

Show-Status

if ($backendOk -and $frontendOk -and $whatsAppOk) {
    Write-Host "  Durdurmak icin: .\scripts\start-all.ps1 -Stop" -ForegroundColor DarkGray
    Write-Host ""
    exit 0
}

Write-Err "Bazi servisler baslatilamadi. Loglar: $LogDir"
Write-Host ""
exit 1
