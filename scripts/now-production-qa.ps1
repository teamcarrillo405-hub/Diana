param(
  [ValidateSet('Build', 'Start')][string]$Mode = 'Build',
  [ValidateRange(1024, 65535)][int]$Port = 3014,
  [ValidatePattern('^\.next-now-[a-z0-9-]+$')][string]$BuildDirectory = '.next-now-qa',
  [ValidatePattern('^\.tsconfig-beta-[a-f0-9]{12}\.json$')][string]$TypeScriptConfig = '.tsconfig-beta-091400000004.json',
  [switch]$SkipLint
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:DIANA_NOW_LOCAL_QA = '1'
$env:NEXT_DIST_DIR = $BuildDirectory
$env:NEXT_TYPESCRIPT_CONFIG = $TypeScriptConfig
$next = Join-Path (Get-Location) 'node_modules/next/dist/bin/next'

if ($env:VERCEL) { throw 'This review is local-only, never a deployment target.' }
if ($Mode -eq 'Build') {
  $arguments = @($next, 'build')
  if ($SkipLint) { $arguments += '--no-lint' }
  $declarationPath = Join-Path (Get-Location) 'next-env.d.ts'
  $before = [IO.File]::ReadAllText($declarationPath)
  try {
    & node @arguments
    $code = $LASTEXITCODE
  } finally {
    # Only undo Next's known generated route reference, never concurrent edits.
    $after = [IO.File]::ReadAllText($declarationPath)
    $reference = '(?m)^/// <reference path="[^"]*/types/routes\.d\.ts" />'
    $originalReference = [regex]::Match($before, $reference).Value
    $qaReference = '/// <reference path="./' + $BuildDirectory + '/types/routes.d.ts" />'
    $expected = $after.Replace($qaReference, $originalReference).Replace("`r`n", "`n")
    if ($originalReference -and $expected -eq $before.Replace("`r`n", "`n")) {
      [IO.File]::WriteAllText($declarationPath, $before)
    }
  }
  exit $code
} else {
  & node $next start --hostname 127.0.0.1 --port $Port
}
exit $LASTEXITCODE
