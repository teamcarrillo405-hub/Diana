param([Parameter(Mandatory = $true)][string]$LiteralPath)

$ErrorActionPreference = 'Stop'
$item = Get-Item -LiteralPath $LiteralPath -Force
if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'Private research path must not be a reparse point.'
}
$acl = Get-Acl -LiteralPath $item.FullName
if ($item.PSIsContainer -and -not $acl.AreAccessRulesProtected) {
    throw 'Private research directory must have inheritance disabled.'
}
$currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$ownerSid = $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value
$allowed = @($currentSid, 'S-1-5-18', 'S-1-5-32-544')
if ($allowed -notcontains $ownerSid) {
    throw 'Private research path has an unexpected owner.'
}
$rules = $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])
if ($rules.Count -eq 0) {
    throw 'Private research path has no explicit or inherited access rules.'
}
$currentCanReadWrite = $false
$read = [Security.AccessControl.FileSystemRights]::ReadData
$write = [Security.AccessControl.FileSystemRights]::WriteData
foreach ($rule in $rules) {
    if ($rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow) { continue }
    $sid = $rule.IdentityReference.Value
    if ($allowed -notcontains $sid) {
        throw 'Private research path allows an untrusted principal.'
    }
    if ($sid -eq $currentSid -and (($rule.FileSystemRights -band $read) -ne 0) -and (($rule.FileSystemRights -band $write) -ne 0)) {
        $currentCanReadWrite = $true
    }
}
if (-not $currentCanReadWrite) {
    throw 'Current operator needs an explicit read/write rule on the private research path.'
}
@{ safe = $true; path = $item.FullName; ownerSid = $ownerSid } | ConvertTo-Json -Compress
