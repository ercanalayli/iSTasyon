param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-zA-Z0-9_-]{2,64}$')][string]$Site,
  [string]$Username
)

$ErrorActionPreference='Stop'
$root = Split-Path -Parent $PSScriptRoot
$registryPath = Join-Path $root 'config\site_access_registry.json'
if (-not (Test-Path -LiteralPath $registryPath)) {
  $configDir = Split-Path -Parent $registryPath
  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
  try {
    $registryContent = & git -C $root show origin/main:config/site_access_registry.json 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $registryContent) { throw 'git_show_failed' }
    [IO.File]::WriteAllLines($registryPath, $registryContent, [Text.UTF8Encoding]::new($false))
  } catch {
    throw 'site_access_registry.json bulunamadi ve origin/main uzerinden getirilemedi.'
  }
}

$registry = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json
$key = $Site.ToLowerInvariant()
$siteProp = $registry.sites.PSObject.Properties[$key]
if (-not $siteProp) { throw "Kayitli olmayan site: $key" }

$dir = Join-Path $root '.aperion-secrets\site-credentials'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$securePath = Join-Path $dir ($key + '.secure')
$metaPath = Join-Path $dir ($key + '.json')

if (-not $Username) {
  $Username = Read-Host "Kullanici adi / e-posta ($key)"
}
$pw = Read-Host "Sifre ($key)" -AsSecureString
if (-not $pw) { throw 'Sifre alinmadi.' }

$sealed = ConvertFrom-SecureString $pw
[IO.File]::WriteAllText($securePath,$sealed,[Text.UTF8Encoding]::new($false))
$meta = [ordered]@{
  site_key = $key
  username = $Username
  storage = 'windows_dpapi'
  created_at = (Get-Date).ToUniversalTime().ToString('o')
  password_present = $true
}
[IO.File]::WriteAllText($metaPath,($meta | ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))

try {
  & icacls $dir /inheritance:r /grant:r "$env:USERNAME:(OI)(CI)F" | Out-Null
} catch {}

Write-Host ("OK - {0} kimlik bilgisi DPAPI ile yerelde saklandi. Sifre ekrana veya repoya yazilmadi." -f $key)
