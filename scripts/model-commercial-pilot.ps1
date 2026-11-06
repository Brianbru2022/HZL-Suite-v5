param(
  [string]$PilotReference = '2026.007.P',
  [string]$DatabasePath = "$env:APPDATA\com.qspro.boq-generator\qs-pro.db",
  [string]$SqlitePath = 'C:\Program Files\GDAL\sqlite3.exe'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $DatabasePath)) { throw "Database not found: $DatabasePath" }
if (-not (Test-Path -LiteralPath $SqlitePath)) { throw "sqlite3.exe not found: $SqlitePath" }

$pilotJson = & $SqlitePath -noheader $DatabasePath "SELECT value FROM appraisals_state WHERE json_extract(value, '$.reference') = '$PilotReference';"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($pilotJson)) { throw "Pilot appraisal not found: $PilotReference" }

$pilot = $pilotJson | ConvertFrom-Json
$option = $pilot.options | Where-Object { $_.id -eq $pilot.selectedOptionId } | Select-Object -First 1
if (-not $option) { $option = $pilot.options | Select-Object -First 1 }
if (-not $option) { throw 'Pilot has no commercial option.' }

function Set-JsonProperty([object]$Target, [string]$Name, $Value) {
  Add-Member -InputObject $Target -NotePropertyName $Name -NotePropertyValue $Value -Force
}

$templateId = [string]$option.commercialTemplateId
if ([string]::IsNullOrWhiteSpace($templateId)) { throw 'Pilot has no selected commercial template.' }
$revenueIds = @($option.revenueLines | ForEach-Object { $_.id })
$costIds = @($option.costLines | ForEach-Object { $_.id })
if ($revenueIds.Count -eq 0 -or $costIds.Count -eq 0) { throw 'Pilot needs retained commercial revenue and cost rows before it can be modelled.' }

$now = (Get-Date).ToUniversalTime().ToString('o')
Set-JsonProperty -Target $option -Name 'commercialAssessmentStage' -Value 'MODELLED'
Set-JsonProperty -Target $option -Name 'commercialTemplateInputs' -Value ([ordered]@{
  bedrooms = 80
  grossFloorAreaM2 = 3600
  siteAreaM2 = 6800
  parkingSpaces = 80
  programmeMonths = 14
})
Set-JsonProperty -Target $option -Name 'durationMonths' -Value 14
Set-JsonProperty -Target $option -Name 'commercialScopeAssessment' -Value ([ordered]@{
  siteAreaM2 = 2639
  summary = 'The retained preliminary assessment identifies a constrained Cambuslang commercial site. This pilot retains the selected hotel template solely to test the complete cost, revenue, lifecycle, exit and export workflow; the final mix remains subject to planning, access, servicing and market confirmation.'
  excludedOpportunities = @('Additional site uses are not valued in this pilot because the retained preliminary assessment does not yet confirm their operating terms, occupier demand, servicing capacity or investment basis.')
  source = 'PILOT_VALIDATION'
  updatedAt = $now
})
Set-JsonProperty -Target $option -Name 'commercialAssets' -Value @([ordered]@{
  id = "commercial-template-asset-$templateId"
  title = 'Travelodge style hotel asset'
  description = 'Separately modelled hotel asset using the selected template revenue and cost rows.'
  source = 'TEMPLATE'
  included = $true
  revenueModel = 'LEASE'
  siteAllocationM2 = 3600
  revenueLineIds = $revenueIds
  costLineIds = $costIds
  exitYieldPercent = 5.75
  rationale = 'Existing selected commercial template. Revenue, cost, lifecycle, debt interest and exit assumptions remain separately traceable in the pilot.'
  createdAt = $now
  updatedAt = $now
})
$assumptionLines = @(
  $option.assumptions
  '0.1.11 pilot: retained preliminary evidence and the selected hotel template are used only to validate the commercial workflow. No unconfirmed secondary use is valued.'
) | Where-Object { $_ } | Select-Object -Unique
Set-JsonProperty -Target $option -Name 'assumptions' -Value ([string]::Join("`n", [string[]]$assumptionLines))
Set-JsonProperty -Target $option -Name 'updatedAt' -Value $now
Set-JsonProperty -Target $pilot -Name 'updatedAt' -Value $now

$payload = $pilot | ConvertTo-Json -Depth 100 -Compress
$payloadPath = Join-Path $env:TEMP "hzl-commercial-pilot-model-$($pilot.id).json"
$payload | Set-Content -LiteralPath $payloadPath -Encoding utf8
try {
  $sqlitePayloadPath = $payloadPath.Replace('\', '/')
  & $SqlitePath $DatabasePath "UPDATE appraisals_state SET value = CAST(readfile('$sqlitePayloadPath') AS TEXT), updated_at = '$now' WHERE id = '$($pilot.id)';"
  if ($LASTEXITCODE -ne 0) { throw 'Unable to update the commercial pilot.' }
} finally {
  Remove-Item -LiteralPath $payloadPath -Force -ErrorAction SilentlyContinue
}

& $SqlitePath -header -column $DatabasePath "SELECT json_extract(value, '$.id') AS id, json_extract(value, '$.name') AS name, json_extract(value, '$.options[0].commercialAssessmentStage') AS stage, json_array_length(json_extract(value, '$.options[0].commercialAssets')) AS assets, json_array_length(json_extract(value, '$.options[0].revenueLines')) AS revenue_rows, json_array_length(json_extract(value, '$.options[0].costLines')) AS cost_rows, json_array_length(json_extract(value, '$.options[0].commercialInitialAssessmentBriefs')) AS briefs FROM appraisals_state WHERE json_extract(value, '$.reference') = '$PilotReference';"
