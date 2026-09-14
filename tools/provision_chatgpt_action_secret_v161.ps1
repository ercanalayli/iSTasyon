$ErrorActionPreference = 'Stop'
$bridgeRoot = 'C:\Users\HP\Documents\Codex\2026-08-27\referenced-chatgpt-conversation-this-is-an\work\aperion-command-bridge'
$sealedPath = Join-Path $bridgeRoot 'state\chatgpt-action-secret.dpapi'
$bytes = [byte[]]::new(48)
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
try {
  $secret | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -LiteralPath $sealedPath -NoNewline -Encoding UTF8
  $psi = [Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = 'cmd.exe'
  $psi.Arguments = '/d /s /c npx wrangler secret put CHATGPT_ACTION_SECRET'
  $psi.WorkingDirectory = $bridgeRoot
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $process = [Diagnostics.Process]::Start($psi)
  $process.StandardInput.WriteLine($secret)
  $process.StandardInput.Close()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw "wrangler_secret_put_failed:$($process.ExitCode):$stderr" }
  [pscustomobject]@{ ok=$true; secret='stored_dpapi_and_cloudflare'; plaintext_exposed=$false } | ConvertTo-Json -Compress
} finally {
  [Array]::Clear($bytes,0,$bytes.Length)
  $rng.Dispose()
  $secret = $null
}
