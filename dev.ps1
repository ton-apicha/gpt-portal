$ErrorActionPreference = 'Stop'

function Wait-Http($url, $timeoutSec=120) {
  $start = Get-Date
  while((Get-Date) - $start -lt (New-TimeSpan -Seconds $timeoutSec)){
    try { $r = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 2; if($r.StatusCode -ge 200){ return $true } } catch {}
    Start-Sleep -Seconds 1
  }
  return $false
}

# run dev in background and redirect logs
$devOut = Join-Path $PSScriptRoot 'dev.out.log'
$devErr = Join-Path $PSScriptRoot 'dev.err.log'
if (Test-Path $devOut) { Remove-Item $devOut -Force }
if (Test-Path $devErr) { Remove-Item $devErr -Force }

Start-Process -WindowStyle Hidden -FilePath 'cmd.exe' -ArgumentList '/c npm.cmd run dev' -WorkingDirectory $PSScriptRoot -RedirectStandardOutput $devOut -RedirectStandardError $devErr | Out-Null

if(Wait-Http 'http://localhost:3000/' 120){
  Write-Host 'Dev server is ready at http://localhost:3000'
  Get-Content -Wait $devOut
} else {
  Write-Host 'Dev server not responding, last error log:'
  if(Test-Path $devErr){ Get-Content $devErr -Tail 200 }
}
