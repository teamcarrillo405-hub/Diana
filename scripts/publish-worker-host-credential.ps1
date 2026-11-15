# Explicit operator action only, after root review of the additive auth candidate.
param([Parameter(Mandatory=$true)][string]$SecretPath, [Parameter(Mandatory=$true)][string]$ReceiptPath)
$ErrorActionPreference = 'Stop'
$release = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'artifacts/learning-engine/release'))
$secretFile = [IO.Path]::GetFullPath($SecretPath)
$receipt = [IO.Path]::GetFullPath($ReceiptPath)
if (!$secretFile.StartsWith($release + [IO.Path]::DirectorySeparatorChar) -or !$receipt.StartsWith($release + [IO.Path]::DirectorySeparatorChar) -or (Test-Path -LiteralPath $receipt)) { throw 'Exclusive workspace release paths required' }
$secure = (Get-Content -Raw -LiteralPath $secretFile).Trim() | ConvertTo-SecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ($token -cnotmatch '^[a-f0-9]{64}$') { throw 'Invalid dedicated credential' }
  $auth = Get-Content -Raw -LiteralPath (Join-Path $env:APPDATA 'com.vercel.cli/Data/auth.json') | ConvertFrom-Json
  $headers = @{Authorization='Bearer '+$auth.token}
  $project='prj_lI3gtW45D2xNmAb4b34frYDL2R5L'; $team='team_vyKUmwTzgUVTS0zhf8lqZVPB'
  $metadata=Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$project/env?teamId=$team" -Headers $headers -TimeoutSec 30
  if (@($metadata.envs | Where-Object { $_.key -eq 'DIANA_WINDOWS_WORKER_API_TOKEN' -and $_.target -contains 'production' }).Count -ne 0) { throw 'Dedicated variable already exists; refusing to replace or rotate it' }
  $body=@{key='DIANA_WINDOWS_WORKER_API_TOKEN';value=$token;type='sensitive';target=@('production')} | ConvertTo-Json -Compress
  $null=Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v10/projects/$project/env?teamId=$team" -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 30
  $result=@{at=[DateTime]::UtcNow.ToString('o');credentialName='DIANA_WINDOWS_WORKER_API_TOKEN';target='production';originalTokenRotated=$false;freshDeploymentRequired=$true;workerStarted=$false;productionRoutingChanged=$false}
  $result | ConvertTo-Json | Set-Content -LiteralPath $receipt
  $result | ConvertTo-Json
} catch { throw 'Dedicated credential publish did not complete; inspect variable names before retrying. No credential value is logged.' }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);$token=$null;$body=$null;$auth=$null;$headers=$null }
