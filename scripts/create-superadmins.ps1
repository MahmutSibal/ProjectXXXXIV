<#
.SYNOPSIS
    Üç platform yöneticisi (SuperAdmin) hesabı açar. Şifreleri SİZ yazarsınız.

.DESCRIPTION
    Mevcut bir SuperAdmin ile giriş yapar, sonra her hesap için şifreyi (iki kez) sorar ve
    POST /api/users/super-admin ucuyla hesabı açar. Şifreler ekrana yazılmaz, dosyaya veya
    komut satırına kaydedilmez; yalnızca HTTPS isteğiyle sunucuya gider.

    Önce backend'in bu uçla birlikte yayınlanmış olması gerekir (deploy-monsterasp.ps1).

    Şifre kuralı: en az 12 karakter, büyük harf, küçük harf, rakam ve özel karakter.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\create-superadmins.ps1
#>
[CmdletBinding()]
param(
    [string]$ApiBase = 'https://mahmutapp.tryasp.net/api',
    [string[]]$Emails = @('superadmin@sukranapp.com', 'admin@sukranapp.com', 'destek@sukranapp.com'),
    [string[]]$Names = @('Süper Yönetici', 'Yönetici', 'Destek Yöneticisi')
)

$ErrorActionPreference = 'Stop'
$ApiBase = $ApiBase.TrimEnd('/')

function ConvertTo-Plain([securestring]$secure) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Test-Strong([string]$password) {
    $password.Length -ge 12 -and $password -cmatch '[a-z]' -and $password -cmatch '[A-Z]' -and
        $password -match '[0-9]' -and $password -match '[^a-zA-Z0-9]'
}

function Get-ErrorText($err) {
    try {
        $reader = New-Object IO.StreamReader($err.Exception.Response.GetResponseStream())
        $text = $reader.ReadToEnd()
        if ($text) { return $text }
    }
    catch { }
    return $err.Exception.Message
}

Write-Host "`n=== Mevcut yönetici ile giriş ($ApiBase) ===" -ForegroundColor Cyan
$loginEmail = Read-Host 'Mevcut SuperAdmin e-posta'
$loginPassword = ConvertTo-Plain (Read-Host 'Mevcut SuperAdmin şifre' -AsSecureString)

try {
    $login = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/login" -ContentType 'application/json' `
        -Body (@{ email = $loginEmail; password = $loginPassword } | ConvertTo-Json)
}
catch { throw "Giriş başarısız: $(Get-ErrorText $_)" }
finally { $loginPassword = $null }

$headers = @{ Authorization = "Bearer $($login.accessToken)" }

for ($i = 0; $i -lt $Emails.Count; $i++) {
    $email = $Emails[$i]
    $name = if ($i -lt $Names.Count) { $Names[$i] } else { 'Yönetici' }
    Write-Host "`n=== $email ===" -ForegroundColor Cyan

    $plain = $null
    while ($true) {
        $first = ConvertTo-Plain (Read-Host "Şifre ($email)" -AsSecureString)
        if (-not (Test-Strong $first)) {
            Write-Host '  Şifre zayıf: en az 12 karakter; büyük harf, küçük harf, rakam ve özel karakter içermeli.' -ForegroundColor Yellow
            continue
        }
        $second = ConvertTo-Plain (Read-Host 'Şifre (tekrar)' -AsSecureString)
        if ($first -ne $second) {
            Write-Host '  Şifreler aynı değil, tekrar deneyin.' -ForegroundColor Yellow
            continue
        }
        $plain = $first
        break
    }

    try {
        $body = @{ name = $name; email = $email; password = $plain } | ConvertTo-Json
        [void](Invoke-RestMethod -Method Post -Uri "$ApiBase/users/super-admin" -Headers $headers `
            -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)))
        Write-Host "  Hesap açıldı: $email" -ForegroundColor Green
    }
    catch { Write-Host "  Açılamadı: $(Get-ErrorText $_)" -ForegroundColor Red }
    finally { $plain = $null; $first = $null; $second = $null }
}

Write-Host "`nBitti. Giriş adresi: https://sukranapp.com/giris-yap" -ForegroundColor Green
