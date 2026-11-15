param([Parameter(Mandatory=$true)][string]$PrivateDirectory)
$ErrorActionPreference = 'Stop'
$release = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'artifacts/learning-engine/release'))
$target = [IO.Path]::GetFullPath($PrivateDirectory)
if (!$target.StartsWith($release + [IO.Path]::DirectorySeparatorChar) -or (Test-Path -LiteralPath $target)) { throw 'New exclusive workspace release directory required' }
$null = New-Item -ItemType Directory -Path $target
$acl = Get-Acl -LiteralPath $target
$acl.SetAccessRuleProtection($true, $false)
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-18'), 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
Set-Acl -LiteralPath $target -AclObject $acl
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$token = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
$secure = ConvertTo-SecureString -String $token -AsPlainText -Force
$secretPath = Join-Path $target 'windows-worker-token.dpapi'
ConvertFrom-SecureString -SecureString $secure | Set-Content -LiteralPath $secretPath
$roundTrip = (Get-Content -Raw -LiteralPath $secretPath).Trim() | ConvertTo-SecureString
$check = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($roundTrip)
try { if ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($check) -ne $token) { throw 'DPAPI round-trip failed' } }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($check); $token=$null; [Array]::Clear($bytes,0,$bytes.Length) }
@{at=[DateTime]::UtcNow.ToString('o');secretPath=$secretPath;credentialName='DIANA_WINDOWS_WORKER_API_TOKEN';generatedBits=256;storage='Windows CurrentUser DPAPI';aclInheritanceDisabled=$true;published=$false;originalTokenRotated=$false} | ConvertTo-Json
