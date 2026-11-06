[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateScript({ Test-Path -LiteralPath $_ })]
  [string]$InstallerPath,
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[A-Fa-f0-9]{40}$')]
  [string]$CertificateThumbprint,
  [string]$TimestampServer = 'http://timestamp.digicert.com'
)

$ErrorActionPreference = 'Stop'
$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$signatureTool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if (-not $signatureTool) {
  $kitRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
  $signatureTool = Get-ChildItem -LiteralPath $kitRoot -Filter signtool.exe -Recurse -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1
}
if (-not $signatureTool) { throw 'signtool.exe was not found. Install the Windows SDK signing tools.' }
$signatureToolPath = if ($signatureTool -is [System.Management.Automation.CommandInfo]) { $signatureTool.Path } else { $signatureTool.FullName }

& $signatureToolPath sign /sha1 $CertificateThumbprint /fd SHA256 /tr $TimestampServer /td SHA256 $installer
if ($LASTEXITCODE -ne 0) { throw "Signing failed with exit code $LASTEXITCODE." }

$signature = Get-AuthenticodeSignature -LiteralPath $installer
if ($signature.Status -ne 'Valid') { throw "Signature verification failed: $($signature.Status) $($signature.StatusMessage)" }
Write-Host "Signed and verified: $installer" -ForegroundColor Green
