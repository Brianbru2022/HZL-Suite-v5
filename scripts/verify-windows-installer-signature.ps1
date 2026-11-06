[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateScript({ Test-Path -LiteralPath $_ })]
  [string]$InstallerPath
)

$ErrorActionPreference = 'Stop'
$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$signature = Get-AuthenticodeSignature -LiteralPath $installer
$signature | Select-Object Status, StatusMessage, @{ Name = 'Signer'; Expression = { $_.SignerCertificate.Subject } }, @{ Name = 'Thumbprint'; Expression = { $_.SignerCertificate.Thumbprint } }, @{ Name = 'Timestamp'; Expression = { $_.TimeStamperCertificate.Subject } } | Format-List
if ($signature.Status -ne 'Valid') { throw "Installer signature is not valid: $($signature.Status) $($signature.StatusMessage)" }
Write-Host "Installer signature is valid: $installer" -ForegroundColor Green

