param(
  [string]$SourceAppraisalId = '059d2750-494d-4f6b-92be-8f79654a2edb',
  [string]$PilotName = 'Cambuslang (Commercial) - 0.1.11 Commercial Pilot',
  [string]$PilotReference = '2026.007.P',
  [string]$DatabasePath = "$env:APPDATA\com.qspro.boq-generator\qs-pro.db",
  [string]$BackupDirectory = 'D:\workapps\HZL\QS\backups\HZL-QS-Suite-0.1.11-commercial-pilot',
  [string]$SqlitePath = 'C:\Program Files\GDAL\sqlite3.exe',
  [switch]$UseExistingCheckpoint
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $DatabasePath)) { throw "Database not found: $DatabasePath" }
if (-not (Test-Path -LiteralPath $SqlitePath)) { throw "sqlite3.exe not found: $SqlitePath" }

New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$checkpoint = Join-Path $BackupDirectory 'qs-pro-before-commercial-pilot.qsbackup'
if (-not $UseExistingCheckpoint) {
  & $SqlitePath $DatabasePath ".backup '$checkpoint'"
}
if (-not (Test-Path -LiteralPath $checkpoint) -or (Get-Item -LiteralPath $checkpoint).Length -eq 0) { throw 'Unable to create the pre-pilot SQLite checkpoint.' }

$sourceJson = & $SqlitePath -noheader $DatabasePath "SELECT value FROM appraisals_state WHERE id = '$SourceAppraisalId';"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($sourceJson)) { throw "Source appraisal not found: $SourceAppraisalId" }

$pilotId = [guid]::NewGuid().ToString()
$pilotOptionId = [guid]::NewGuid().ToString()
$pilot = $sourceJson | ConvertFrom-Json
$pilot.id = $pilotId
$pilot.name = $PilotName
$pilot.site = $PilotName
$pilot.reference = $PilotReference
$pilot.versionSummary = '0.1.11 Commercial Pilot clone. Source record retained unchanged for controlled lifecycle, report, export, and restore validation.'
$pilot.updatedAt = (Get-Date).ToUniversalTime().ToString('o')
$pilot.selectedOptionId = $pilotOptionId
if ($pilot.options -and $pilot.options.Count -gt 0) {
  $pilot.options[0].id = $pilotOptionId
  $pilot.options[0].name = '0.1.11 Commercial Pilot'
  $assumptionLines = @(
    $pilot.options[0].assumptions,
    'Pilot clone for controlled 0.1.11 validation. Source commercial appraisal remains unchanged.'
  ) | Where-Object { $_ }
  $pilot.options[0].assumptions = [string]::Join("`n", [string[]]$assumptionLines)
}

$pilotJsonPath = Join-Path $env:TEMP "hzl-commercial-pilot-$pilotId.json"
$pilot | ConvertTo-Json -Depth 100 -Compress | Set-Content -LiteralPath $pilotJsonPath -Encoding utf8
try {
  $sqliteDataPath = $pilotJsonPath.Replace('\', '/')
  $updatedAt = (Get-Date).ToUniversalTime().ToString('o')
  & $SqlitePath $DatabasePath "BEGIN; UPDATE appraisals_state SET position = position + 1; INSERT INTO appraisals_state (id, position, value, updated_at) VALUES ('$pilotId', 0, CAST(readfile('$sqliteDataPath') AS TEXT), '$updatedAt'); COMMIT;"
  if ($LASTEXITCODE -ne 0) { throw 'Unable to insert the pilot clone.' }
} finally {
  Remove-Item -LiteralPath $pilotJsonPath -Force -ErrorAction SilentlyContinue
}

& $SqlitePath -header -column $DatabasePath "SELECT id, position, json_extract(value, '$.name') AS name, json_extract(value, '$.reference') AS reference, json_extract(value, '$.options[0].commercialAssessmentStage') AS stage, json_array_length(json_extract(value, '$.options[0].commercialInitialAssessmentBriefs')) AS briefs FROM appraisals_state WHERE id = '$pilotId';"
Write-Host "PILOT_CHECKPOINT=$checkpoint"
