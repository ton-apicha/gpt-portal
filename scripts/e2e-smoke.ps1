$ErrorActionPreference = 'Stop'

function Wait-Http($url, $timeoutSec=60) {
  $start = Get-Date
  while((Get-Date) - $start -lt (New-TimeSpan -Seconds $timeoutSec)){
    try { $r = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 2; if($r.StatusCode -ge 200){ return $true } } catch {}
    Start-Sleep -Seconds 1
  }
  return $false
}

# Ensure Next dev is running
if(-not (Wait-Http 'http://localhost:3000/' 2)){
  Start-Process -WindowStyle Hidden -FilePath 'cmd.exe' -ArgumentList '/c npm.cmd run dev > dev.out.log 2> dev.err.log' | Out-Null
  if(-not (Wait-Http 'http://localhost:3000/' 120)) { throw 'Next.js not responding' }
}

# Seed admin (optional for local dev)
try { npm run db:seed | Out-Null } catch {}

# Call chat API to stream with test bypass
$chatReq = @{ messages = @(@{ role='user'; content='ตอบคำเดียว: พร้อม' }) } | ConvertTo-Json -Compress
$chat = Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://localhost:3000/api/chat' -ContentType 'application/json' -Headers @{ 'x-test-bypass'='1' } -Body $chatReq
if($chat.StatusCode -lt 200 -or $chat.StatusCode -ge 400){ throw 'Chat API failed' }
Write-Host 'E2E OK'


