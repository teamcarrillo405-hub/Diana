# Credentialed durable configuration only. Deliberately never starts a worker.
param([Parameter(Mandatory=$true)][string]$SecretPath,[Parameter(Mandatory=$true)][string]$ReceiptPath)
$ErrorActionPreference='Stop'
$release=[IO.Path]::GetFullPath((Join-Path (Get-Location) 'artifacts/learning-engine/release'))
$secretFile=[IO.Path]::GetFullPath($SecretPath);$receipt=[IO.Path]::GetFullPath($ReceiptPath)
if (!$secretFile.StartsWith($release+[IO.Path]::DirectorySeparatorChar) -or !$receipt.StartsWith($release+[IO.Path]::DirectorySeparatorChar) -or (Test-Path -LiteralPath $receipt)) { throw 'Exclusive workspace release paths required' }
$secure=(Get-Content -Raw -LiteralPath $secretFile).Trim()|ConvertTo-SecureString
$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$docker='C:/Users/glcar/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe'
$image='sha256:cad8278e6c62fadedaad6bef0e4d6a57be925870dea63c2b37504020713db7be'
$name='diana-windows-worker-credentialed-standby-20260929'
try {
  $env:WORKER_API_TOKEN=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ($env:WORKER_API_TOKEN -cnotmatch '^[a-f0-9]{64}$') { throw 'Malformed dedicated credential' }
  $null=& $docker create --name $name --pull=never --restart unless-stopped --network none --read-only --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:rw,noexec,nosuid,size=16m --env WORKER_API_TOKEN --env DIANA_WORKER_BASE_URL=https://diana-umber.vercel.app --env DIANA_WORKER_ID=windows-r9700-scoped-standby --env DIANA_WORKER_QUEUE=student-ai-candidate-smoke-windows-host --env "DIANA_WORKER_IMAGE_SHA=$image" --env OPENJARVIS_BASE_URL=http://127.0.0.1:1 --env OPENJARVIS_MODEL=qwen3.8:27b $image
  if ($LASTEXITCODE -ne 0) { throw 'Standby creation failed; no replacement attempted' }
  $info=(& $docker inspect $name|ConvertFrom-Json)[0]
  if ($info.Image -ne $image -or $info.State.Status -ne 'created' -or $info.State.Running -or $info.HostConfig.NetworkMode -ne 'none' -or !$info.HostConfig.ReadonlyRootfs) { throw 'Standby inspection mismatch' }
  $envNames=@($info.Config.Env|ForEach-Object {($_ -split '=',2)[0]})
  if (@($envNames|Where-Object {$_ -match 'SUPABASE|OPENAI|ANTHROPIC|QA_USER'}).Count -ne 0) { throw 'Unexpected credential namespace in standby' }
  $result=@{at=[DateTime]::UtcNow.ToString('o');image=$image;container=$name;state=$info.State.Status;running=$false;network='none';restartPolicy=$info.HostConfig.RestartPolicy.Name;queue='student-ai-candidate-smoke-windows-host';credentialSource='DPAPI dedicated DIANA_WINDOWS_WORKER_API_TOKEN mapped to worker WORKER_API_TOKEN';legacyTokenUnchanged=$true;modelRunning=$false;productionEligible=$false;providerCredentialsPresent=$false;activationRequires='Reviewed qualified sidecar and explicit network activation; do not simply start this container'}
  $result|ConvertTo-Json -Depth 4|Set-Content -LiteralPath $receipt
  $result|ConvertTo-Json -Depth 4
} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);Remove-Item Env:WORKER_API_TOKEN -ErrorAction SilentlyContinue}
