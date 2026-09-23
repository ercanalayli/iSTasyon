$ErrorActionPreference = 'Stop'

$bridgeRoot = 'C:\Users\HP\Documents\Codex\2026-08-27\referenced-chatgpt-conversation-this-is-an\work\aperion-command-bridge'
$sealedPath = Join-Path $bridgeRoot 'state\chatgpt-action-secret.dpapi'

if (-not (Test-Path -LiteralPath $sealedPath)) {
  throw 'chatgpt-action-secret.dpapi bulunamadi.'
}

$secure = ConvertTo-SecureString (Get-Content -LiteralPath $sealedPath -Raw).Trim()
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if ([string]::IsNullOrWhiteSpace($secret)) { throw 'Action secret bos.' }
  Set-Clipboard -Value $secret
  Write-Host 'ApeirON Action anahtari panoya kopyalandi. Deger ekranda gosterilmedi.' -ForegroundColor Green
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  $secret = $null
}
