# AperiON BizimHesap: local, one-time SAFE hotfix.
# No new logins, no BizimHesap writes, no automatic retry of financial tasks.
$ErrorActionPreference = 'Stop'
$Root = 'C:\AperiON\iSTasyon'
$Commit = 'e2a96052c3e706d3689bc07c4a76e72329b07ce7'
$Targets = [ordered]@{
 'tools/aperion_command_listener.cjs'='f4401e9a5702b53b1a09ff2e56bbab45f80fe82f'
 'tools/lib/bizimhesap_session_ports.cjs'='fb907f5ebf6c71b0dc7a3c74194df0b43c649a79'
 'tools/test_bizimhesap_session_ports.cjs'='6166e62af7dd673f6f0a7d9393e314782ae08ce6'
}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$base=Join-Path $Root ('local-secrets\hotfix-'+$stamp)
$stage=Join-Path $base 'stage'
$backup=Join-Path $base 'backup'
$changed=$false
function Log([string]$s){ Write-Host ('AperiON | '+$s) }
function LocalFile([string]$rel){ return ($rel -replace '/','\') }
function ProcList {
 return @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
   Where-Object { $_.CommandLine -like '*aperion_command_listener.cjs*' })
}
function DbCfg {
 $file=Join-Path $Root 'local-secrets\bizimhesap.local.env'
 if(!(Test-Path -LiteralPath $file)){throw 'Mevcut Supabase ayarlari yok; durduruldu.'}
 $cfg=@{}
 foreach($line in [System.IO.File]::ReadAllLines($file)){
  if($line -match '^\s*(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.+?)\s*$'){
   $cfg[$Matches[1]]=$Matches[2].Trim().Trim('"').Trim("'")
  }
 }
 if(!$cfg.SUPABASE_URL -or !$cfg.SUPABASE_SERVICE_ROLE_KEY){throw 'Supabase ayarlari eksik.'}
 return $cfg
}
function Headers($cfg){return @{
 apikey=$cfg.SUPABASE_SERVICE_ROLE_KEY
 Authorization=('Bearer '+$cfg.SUPABASE_SERVICE_ROLE_KEY)
}}
function CheckIdle {
 $cfg=DbCfg
 $url=$cfg.SUPABASE_URL.TrimEnd('/')+'/rest/v1/bot_commands?select=id&status=eq.processing&limit=1'
 $rows=@(Invoke-RestMethod -Uri $url -Headers (Headers $cfg) -TimeoutSec 20)
 if($rows.Count -gt 0){throw 'Komut isleniyor. Guvenlik icin guncelleme ertelendi.'}
}
function WriteState([string]$status,[string]$detail,[int]$id=0){
 $obj=@{status=$status;detail=$detail;commit=$Commit;backup=$backup;
   time=(Get-Date).ToString('o');health_command=$id;financial_writes=0}
 $obj | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $base 'result.json') -Encoding UTF8
}
function CheckHealth {
 $cfg=DbCfg
 $url=$cfg.SUPABASE_URL.TrimEnd('/')+'/rest/v1/bot_commands'
 $h=Headers $cfg
 $h['Content-Type']='application/json'
 $h['Prefer']='return=representation'
 $body='{"command":"bizimhesap_health","status":"pending","params":{"read_only":true,"audit_purpose":"post-hotfix health; no financial writes"}}'
 $made=@(Invoke-RestMethod -Method Post -Uri $url -Headers $h -Body $body -TimeoutSec 20)
 if($made.Count -ne 1){throw 'Saglik komutu olusturulamadi.'}
 $id=[int]$made[0].id
 Log ('Salt-okuma test #'+$id)
 for($i=0;$i -lt 18;$i++){
  Start-Sleep -Seconds 5
  $rows=@(Invoke-RestMethod -Uri ($url+'?select=id,status,result&id=eq.'+$id) -Headers $h -TimeoutSec 15)
  if($rows.Count -ne 1){continue}
  if($rows[0].status -eq 'completed'){
   $health=$null
   try{$health=ConvertFrom-Json -InputObject ([string]$rows[0].result)}catch{}
   if($health -and $health.authenticated -eq $true){
    WriteState 'LIVE_HEALTH_PASS' 'Chrome 9222 ALAYLI oturumu dogrulandi.' $id
    Log 'CANLI SAGLIK TESTI BASARILI'; return
   }
   WriteState 'LIVE_HEALTH_FAILED' 'Oturum yaniti dogrulanamadi.' $id
   throw 'Saglik komutunda dogrulanmis oturum yok.'
  }
  if($rows[0].status -eq 'failed'){
   WriteState 'LIVE_HEALTH_FAILED' ([string]$rows[0].result) $id
   throw ('Saglik komutu basarisiz #'+$id+': '+[string]$rows[0].result)
  }
 }
 WriteState 'LIVE_HEALTH_TIMEOUT' '90 saniye saglik sonucu yok.' $id
 throw 'Saglik testi zaman asimi.'
}
try {
 if(!(Test-Path -LiteralPath (Join-Path $Root 'tools\aperion_command_listener.cjs'))){
  throw 'C:\AperiON\iSTasyon bulunamadi.'
 }
 if(!(Get-Command git.exe -ErrorAction SilentlyContinue)){throw 'Git bulunamadi.'}
 if(!(Get-Command node.exe -ErrorAction SilentlyContinue)){throw 'Node bulunamadi.'}
 $dirty=@(& git -C $Root status --porcelain -- $Targets.Keys)
 if($LASTEXITCODE -ne 0){throw 'Git durumu okunamadi.'}
 if(($dirty -join '').Trim()){throw 'Hedef dosyalarda yerel degisiklik var; uzerine yazilmayacak.'}
 if(@(ProcList).Count -gt 1){throw 'Birden fazla dinleyici bulundu; islem durduruldu.'}
 CheckIdle
 New-Item -ItemType Directory -Path $stage,$backup -Force | Out-Null
 foreach($rel in $Targets.Keys){
  $filename=LocalFile $rel
  $src=Join-Path $Root $filename
  $dest=Join-Path $stage $filename
  $bak=Join-Path $backup $filename
  if(!(Test-Path -LiteralPath $src)){throw ('Eksik dosya: '+$filename)}
  New-Item -ItemType Directory -Path (Split-Path $dest),(Split-Path $bak) -Force | Out-Null
  Copy-Item -LiteralPath $src -Destination $bak -Force
  $download='https://raw.githubusercontent.com/ercanalayli/iSTasyon/'+$Commit+'/'+$rel
  Invoke-WebRequest -Uri $download -OutFile $dest -UseBasicParsing -TimeoutSec 30
  $hash=(& git hash-object $dest).Trim()
  if($LASTEXITCODE -ne 0 -or $hash -ne $Targets[$rel]){throw ('Hash hatasi: '+$filename)}
 }
 & node --check (Join-Path $stage 'tools\aperion_command_listener.cjs')
 if($LASTEXITCODE -ne 0){throw 'Yeni listener kodu syntax testini gecemedi.'}
 & node (Join-Path $stage 'tools\test_bizimhesap_session_ports.cjs')
 if($LASTEXITCODE -ne 0){throw 'Yeni kod testi basarisiz.'}
 CheckIdle
 foreach($rel in $Targets.Keys){
  $name=LocalFile $rel
  Copy-Item -LiteralPath (Join-Path $stage $name) -Destination (Join-Path $Root $name) -Force
 }
 $changed=$true
 Log 'Guvenli kodlar guncellendi; yedek olusturuldu.'
 $running=@(ProcList)
 if($running.Count -gt 1){throw 'Birden fazla dinleyici bulundu; yeniden baslatilmadi.'}
 CheckIdle
 if($running.Count -eq 1){
  Stop-Process -Id $running[0].ProcessId -Force
  Start-Sleep -Seconds 3
 }
 Start-ScheduledTask -TaskName 'AperiON_BizimHesap_Listener_Watchdog'
 Start-Sleep -Seconds 10
 if(@(ProcList).Count -ne 1){throw 'Dinleyici yeniden baslatma dogrulamasi basarisiz.'}
 WriteState 'DEPLOYED_HEALTH_PENDING' 'Yeni surum calisiyor; oturum kontrol ediliyor.'
 CheckHealth
 Log 'TAMAM: kod ve canli oturum saglik testi basarili.'
} catch {
 $errorMessage=[string]$_.Exception.Message
 Log ('DURDURULDU: '+$errorMessage)
 if($changed){
  Log ('Yeni dosyalar uygulandi ama canli test gecmedi. Geri alma icin yedek: '+$backup)
  if(!(Test-Path -LiteralPath (Join-Path $base 'result.json'))){
   WriteState 'DEPLOYED_UNVERIFIED' $errorMessage
  }
 }else{ Log 'Canli kod degistirilmedi.' }
 exit 1
}
