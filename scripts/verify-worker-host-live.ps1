# Post-deployment health/scope verification. Never authorizes a job or calls a model.
param([Parameter(Mandatory=$true)][string]$SecretPath, [Parameter(Mandatory=$true)][string]$ReceiptPath, [string]$ExactQueueAuditPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$release=[IO.Path]::GetFullPath((Join-Path (Get-Location) 'artifacts/learning-engine/release'))
$secretFile=[IO.Path]::GetFullPath($SecretPath); $receipt=[IO.Path]::GetFullPath($ReceiptPath)
if (!$secretFile.StartsWith($release+[IO.Path]::DirectorySeparatorChar) -or !$receipt.StartsWith($release+[IO.Path]::DirectorySeparatorChar) -or (Test-Path -LiteralPath $receipt)) { throw 'Exclusive workspace release paths required' }
$secure=(Get-Content -Raw -LiteralPath $secretFile).Trim()|ConvertTo-SecureString
$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$handler=[Net.Http.HttpClientHandler]::new(); $handler.AllowAutoRedirect=$false
$client=[Net.Http.HttpClient]::new($handler); $client.Timeout=[TimeSpan]::FromSeconds(30)
$observations=[Collections.Generic.List[object]]::new()
$token=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
function Request([string]$Method,[string]$Path,$Body=$null,[bool]$Authenticated=$true) {
  $message=[Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::new($Method),'https://diana-umber.vercel.app'+$Path)
  if ($Authenticated) { $message.Headers.Authorization=[Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$token) }
  if ($null -ne $Body) { $message.Content=[Net.Http.StringContent]::new(($Body|ConvertTo-Json -Compress),[Text.Encoding]::UTF8,'application/json') }
  try {
    $response=$client.SendAsync($message).GetAwaiter().GetResult()
    $text=$response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $observations.Add(@{method=$Method;path=$Path;status=[int]$response.StatusCode;authenticated=$Authenticated})
    $json=$null; try { $json=$text|ConvertFrom-Json } catch {}
    return @{status=[int]$response.StatusCode;body=$json}
  } finally { $message.Dispose(); if ($response) { $response.Dispose() } }
}
$ok=$false; $failure=$null
try {
  if ($token -cnotmatch '^[a-f0-9]{64}$') { throw 'Dedicated credential malformed' }
  $unauth=Request 'GET' '/api/workers/version' $null $false
  if ($unauth.status -ne 401) { throw 'Unauthenticated endpoint did not reject request' }
  $version=Request 'GET' '/api/workers/version'
  if ($version.status -ne 200 -or !$version.body.ok) { throw 'Dedicated credential or deployment is not ready' }
  $metrics=Request 'GET' '/api/workers/metrics?windowMinutes=1'
  if ($metrics.status -ne 200 -or !$metrics.body.ok -or $metrics.body.metrics.queueName -ne 'student-ai-candidate-smoke-windows-host') { throw 'Dedicated smoke metrics unavailable or incorrectly scoped' }
  if ($metrics.body.metrics.totals.queued -ne 0 -or $metrics.body.metrics.totals.running -ne 0) { throw 'Smoke queue is not empty; refusing claim' }
  $denial=Request 'POST' '/api/workers/claim' @{queueName='student-ai-candidate';workerId='windows-host-health-only';leaseSeconds=5}
  if ($denial.status -ne 403) { throw 'Production queue did not reject dedicated host credential' }
  # Time-window metrics are not sufficient evidence that the whole queue is empty.
  # Default: omit even an empty claim unless a fresh, separately observed exact SQL
  # count is explicitly provided. This audit is operator evidence, not job authority.
  $claimPerformed=$false
  if ($ExactQueueAuditPath) {
    $auditFile=[IO.Path]::GetFullPath($ExactQueueAuditPath)
    if (!$auditFile.StartsWith($release+[IO.Path]::DirectorySeparatorChar)) { throw 'Queue audit must be a workspace release artifact' }
    $audit=Get-Content -Raw -LiteralPath $auditFile|ConvertFrom-Json
    if ($audit.projectId -ne 'oitipayrriupcitgmzju' -or $audit.queueName -ne 'student-ai-candidate-smoke-windows-host' -or $audit.allRows -ne 0 -or $audit.activeRows -ne 0 -or $audit.scope -ne 'exact_queue_all_time_count') { throw 'Exact queue audit did not establish emptiness' }
    $age=([DateTime]::UtcNow-[DateTime]::Parse($audit.observedAt).ToUniversalTime()).TotalSeconds
    if ($age -lt 0 -or $age -gt 120) { throw 'Queue audit is stale' }
    $empty=Request 'POST' '/api/workers/claim' @{queueName='student-ai-candidate-smoke-windows-host';workerId='windows-host-health-only';leaseSeconds=5}
    $claimPerformed=$true
    if ($empty.status -ne 200 -or !$empty.body.ok -or $null -ne $empty.body.job) { throw 'Smoke claim was not empty; no authorization or provider request followed' }
  }
  $env:WORKER_API_TOKEN=$token
  $image='sha256:cad8278e6c62fadedaad6bef0e4d6a57be925870dea63c2b37504020713db7be'
  $docker='C:/Users/glcar/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe'
  $output=& $docker run --rm --pull=never --read-only --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:rw,noexec,nosuid,size=16m --env WORKER_API_TOKEN --env DIANA_WORKER_BASE_URL=https://diana-umber.vercel.app --env DIANA_WORKER_ID=windows-host-health-only --env DIANA_WORKER_QUEUE=student-ai-candidate-smoke-windows-host $image node dist/worker/run-diana-worker.cjs --health
  if ($LASTEXITCODE -ne 0 -or ($output|ConvertFrom-Json).status -ne 'healthy') { throw 'Reviewed container authenticated health failed' }
  $ok=$true
} catch { $failure=$_.Exception.Message }
finally {
  $result=@{at=[DateTime]::UtcNow.ToString('o');ok=$ok;observations=@($observations.ToArray());failure=$failure;modelCalls=0;jobAuthorizations=0;studentQueueClaimsAllowed=$false;productionEligible=$false;containerHealth=$ok;originalTokenRotated=$false;emptyClaimPerformed=$claimPerformed;exactQueueAudit=$ExactQueueAuditPath}
  $result|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $receipt
  $result|ConvertTo-Json -Depth 8
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);$token=$null;$client.Dispose();$handler.Dispose();Remove-Item Env:WORKER_API_TOKEN -ErrorAction SilentlyContinue
}
if (!$ok) { exit 1 }
