param(
  [Parameter(Mandatory=$true)][string]$PrivateDirectory,
  [Parameter(Mandatory=$true)][string]$ReceiptPath,
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [switch]$WithoutCredential
)
$ErrorActionPreference = 'Stop'
$image = 'sha256:cad8278e6c62fadedaad6bef0e4d6a57be925870dea63c2b37504020713db7be'
$docker = 'C:/Users/glcar/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe'
$name = 'diana-windows-worker-disabled-20260929'
$origin = [Uri]$BaseUrl
if ($origin.Scheme -ne 'https' -or $origin.AbsolutePath -ne '/' -or $origin.UserInfo -or $origin.Query -or $origin.Fragment) { throw 'Explicit HTTPS app origin required' }
$release = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'artifacts/learning-engine/release'))
$privatePath = [IO.Path]::GetFullPath($PrivateDirectory)
$receipt = [IO.Path]::GetFullPath($ReceiptPath)
if (!$privatePath.StartsWith($release + [IO.Path]::DirectorySeparatorChar) -or !$receipt.StartsWith($release + [IO.Path]::DirectorySeparatorChar)) { throw 'Paths must be in the workspace release directory' }
if ((Test-Path -LiteralPath $privatePath) -or (Test-Path -LiteralPath $receipt)) { throw 'Refusing to overwrite host state' }
$null = New-Item -ItemType Directory -Path $privatePath
$acl = Get-Acl -LiteralPath $privatePath
$acl.SetAccessRuleProtection($true, $false)
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-18'), 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
Set-Acl -LiteralPath $privatePath -AclObject $acl

# Read only the existing named worker secret; never pull the whole environment.
if ($WithoutCredential) {
  $token = 'DISABLED-NO-PRODUCTION-CREDENTIAL'
} else {
$authPath = Join-Path $env:APPDATA 'com.vercel.cli/Data/auth.json'
$auth = Get-Content -Raw -LiteralPath $authPath | ConvertFrom-Json
$headers = @{ Authorization = 'Bearer ' + $auth.token }
$project = 'prj_lI3gtW45D2xNmAb4b34frYDL2R5L'
$team = 'team_vyKUmwTzgUVTS0zhf8lqZVPB'
$metadata = Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$project/env?teamId=$team" -Headers $headers -TimeoutSec 30
$selected = @($metadata.envs | Where-Object { $_.key -eq 'WORKER_API_TOKEN' -and $_.target -contains 'production' })
if ($selected.Count -ne 1) { throw 'Expected one existing production worker credential' }
$secret = Invoke-RestMethod -Uri "https://api.vercel.com/v1/projects/$project/env/$($selected[0].id)?decrypt=true&teamId=$team" -Headers $headers -TimeoutSec 30
$token = $secret.value
if (!$token -or $token.Length -lt 24 -or $token -match '[\r\n]') { throw 'Worker credential not retrievable or malformed' }
$secure = ConvertTo-SecureString -String $token -AsPlainText -Force
ConvertFrom-SecureString -SecureString $secure | Set-Content -LiteralPath (Join-Path $privatePath 'worker-token.dpapi')
}

# Docker administrators can inspect a container environment. The persisted host
# copy is DPAPI protected; no Supabase/provider/QA credentials enter the container.
$env:WORKER_API_TOKEN = $token
try {
  $rawImage = & $docker image inspect $image
  if ($LASTEXITCODE -ne 0 -or ($rawImage | ConvertFrom-Json)[0].Id -ne $image) { throw 'Reviewed local image unavailable' }
  $arguments = @('create', '--name', $name, '--pull=never', '--restart', 'unless-stopped', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m', '--env', 'WORKER_API_TOKEN', '--env', "DIANA_WORKER_BASE_URL=$BaseUrl",
    '--env', 'DIANA_WORKER_ID=windows-r9700-standby-1', '--env', 'DIANA_WORKER_QUEUE=host-disabled-no-claims-20260929',
    '--env', "DIANA_WORKER_IMAGE_SHA=$image", '--env', 'OPENJARVIS_BASE_URL=http://127.0.0.1:1', '--env', 'OPENJARVIS_MODEL=qwen3.8:27b', $image)
  $container = & $docker @arguments
  if ($LASTEXITCODE -ne 0) { throw 'Disabled container creation failed' }
  $info = (& $docker inspect $name | ConvertFrom-Json)[0]
  if ($info.State.Running -or $info.HostConfig.NetworkMode -ne 'none') { throw 'Disabled host unexpectedly active' }
  $result = @{ schemaVersion='worker-host-disabled-v1'; at=[DateTime]::UtcNow.ToString('o'); container=$name; image=$image; state=$info.State.Status; baseUrl=$BaseUrl;
    network='none'; credentials=$(if ($WithoutCredential) { 'no_production_credential_placeholder_only' } else { 'existing_worker_token_only' }); tokenRotated=$false; privateStorage=$(if ($WithoutCredential) { 'no_secret_stored' } else { 'Windows CurrentUser DPAPI with user/SYSTEM directory ACL' });
    automaticStartup='Docker restart policy configured, container never started'; modelActivated=$false; productionRoutingEnabled=$false; productionEligible=$false;
    activationRequires=@('matching server worker credential','qualified approved sidecar','explicit reviewed network reconfiguration','isolated live queue acceptance','host uptime plan') }
  $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $receipt
  $result | ConvertTo-Json -Depth 5
} finally { Remove-Item Env:WORKER_API_TOKEN -ErrorAction SilentlyContinue; $token=$null; $secret=$null; $auth=$null; $headers=$null }
