$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$secretDir = Join-Path $projectRoot 'local-secrets'
$secretFile = Join-Path $secretDir 'aperion-device.env'
$requestFile = Join-Path $secretDir 'aperion-enroll-request.json'

$clipboardJson = Get-Clipboard -Raw
$result = $clipboardJson | ConvertFrom-Json
if (-not $result.ok) { throw ('Eşleştirme sonucu başarısız: {0}' -f $result.error) }
if ($result.device_token -notmatch '^[A-Za-z0-9_-]{40,100}$') { throw 'Geçersiz cihaz anahtarı.' }
if ($result.device_id -notmatch '^[A-Za-z0-9._-]{8,120}$') { throw 'Geçersiz cihaz kimliği.' }

$request = Get-Content -LiteralPath $requestFile -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
@(
  ('APERION_BASE_URL={0}' -f $request.base_url)
  ('APERION_DEVICE_ID={0}' -f $result.device_id)
  ('APERION_DEVICE_TOKEN={0}' -f $result.device_token)
  ''
) | Set-Content -LiteralPath $secretFile -Encoding utf8

Remove-Item -LiteralPath $requestFile -Force
Set-Clipboard -Value ''
Write-Output ('AperiON cihaz anahtarı güvenli yerel alana kaydedildi: {0}' -f $result.device_id)
