# Northwind workshop readiness check (Windows PowerShell 5.1 or PowerShell 7+).
# Run from the workshop folder:  powershell -ExecutionPolicy Bypass -File tools\ready.ps1
# It only reads versions, then initializes Git for this folder if needed. It installs nothing.

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$results = New-Object System.Collections.Generic.List[object]
function Add-Result($tool, $neededFor, $status, $detail) {
    $results.Add([pscustomobject]@{ Tool = $tool; NeededFor = $neededFor; Status = $status; Detail = $detail })
}
function Get-FirstLine($command, [string[]]$arguments) {
    try {
        $output = @(& $command @arguments 2>&1)
        if ($LASTEXITCODE -eq 0 -and $output.Count -gt 0) { return ([string]$output[0]).Trim() }
    } catch { }
    return $null
}

Write-Host ''
Write-Host 'Northwind workshop - readiness check' -ForegroundColor Cyan
Write-Host "Folder: $root"
Write-Host ''

if (-not (Test-Path -LiteralPath (Join-Path $root 'knowledge-docs\business-case.md'))) {
    Write-Host 'This does not look like the workshop folder (knowledge-docs\business-case.md is missing).' -ForegroundColor Red
    Write-Host 'Open a terminal in the folder you saved from the guide and run the script again.'
    exit 1
}

# Git - required for every part
$git = Get-FirstLine 'git' @('--version')
if ($git) { Add-Result 'Git' 'All parts' 'OK' $git }
else { Add-Result 'Git' 'All parts' 'MISSING' 'Install: winget install --id Git.Git -e' }

# GitHub Copilot CLI - required only if you use the CLI client (the App and VS Code are checked in the guide)
$copilot = Get-FirstLine 'copilot' @('--version')
if ($copilot) {
    Add-Result 'GitHub Copilot CLI' 'CLI client only' 'OK' $copilot
    $plugins = (& copilot plugin list 2>&1 | Out-String)
    $squadMatch = [regex]::Match($plugins, 'hve-squad@hve-squad-plugin\s*\(v?([0-9][0-9.]*)\)')
    $hasSquad = $plugins -match 'hve-squad@hve-squad-plugin'
    $hasCore = $plugins -match 'hve-squad-hve-core@hve-squad-plugin'
    if ($hasSquad -and $hasCore) {
        if ($squadMatch.Success -and $squadMatch.Groups[1].Value -notlike '{{HVE_SQUAD_MINOR}}.*') {
            Add-Result 'HVE Squad plugin pair' 'CLI client only' 'WRONG VERSION' "hve-squad v$($squadMatch.Groups[1].Value) - the guide is built for {{HVE_SQUAD_VERSION}}. Update: see guide, Part 00, step 3"
        } else {
            Add-Result 'HVE Squad plugin pair' 'CLI client only' 'OK' "hve-squad v$($squadMatch.Groups[1].Value) + hve-squad-hve-core installed"
        }
    }
    elseif ($hasSquad -or $hasCore) { Add-Result 'HVE Squad plugin pair' 'CLI client only' 'INCOMPLETE' 'Install both entries (see guide, Part 00)' }
    else { Add-Result 'HVE Squad plugin pair' 'CLI client only' 'MISSING' 'See guide, Part 00, step 3' }
} else {
    Add-Result 'GitHub Copilot CLI' 'CLI client only' 'NOT FOUND' 'Skip if you use the Copilot App or VS Code. Install: winget install GitHub.Copilot'
}
if ($PSVersionTable.PSVersion.Major -ge 7) {
    Add-Result 'PowerShell 7+' 'All parts' 'OK' "pwsh $($PSVersionTable.PSVersion)"
} else {
    $pwsh = Get-FirstLine 'pwsh' @('--version')
    if ($pwsh) { Add-Result 'PowerShell 7+' 'All parts' 'OK' $pwsh }
    else { Add-Result 'PowerShell 7+' 'All parts' 'MISSING' 'The Scribe ledger and model routing need it: winget install --id Microsoft.PowerShell -e' }
}

# .NET 10 SDK - .NET track (Part 06)
$sdks = (& dotnet --list-sdks 2>$null | Out-String)
if ($sdks -match '(?m)^10\.') { Add-Result '.NET 10 SDK' '.NET track' 'OK' (($sdks -split "`n" | Where-Object { $_ -match '^10\.' } | Select-Object -Last 1).Trim()) }
else { Add-Result '.NET 10 SDK' '.NET track' 'MISSING' 'Install: winget install --id Microsoft.DotNet.SDK.10 -e' }

# Azure CLI with Bicep - Azure track (Part 05; local validation only, no sign-in needed)
$az = $null
try {
    $azJson = @(& az version -o json 2>$null)
    if ($LASTEXITCODE -eq 0) { $az = (($azJson -join "`n") | ConvertFrom-Json).'azure-cli' }
} catch { }
if ($az) {
    Add-Result 'Azure CLI' 'Azure track' 'OK' "azure-cli $az"
    $bicep = $null
    try {
        $bicepOut = @(& az bicep version 2>$null)
        if ($LASTEXITCODE -eq 0) { $bicep = $bicepOut | Where-Object { $_ -match 'Bicep CLI version' } | Select-Object -First 1 }
    } catch { }
    if ($bicep) { Add-Result 'Bicep' 'Azure track' 'OK' $bicep }
    else { Add-Result 'Bicep' 'Azure track' 'MISSING' 'Run: az bicep install' }
} else {
    Add-Result 'Azure CLI' 'Azure track' 'OPTIONAL' 'Install: winget install --id Microsoft.AzureCLI -e'
}

# uv and Graphviz - Azure track (Part 05): the HVE Squad python-diagrams skill renders the HLD and LLD
# with the Python diagrams library (0.25.1 or later, latest Azure icons). uv fetches the library on first use.
$uv = Get-FirstLine 'uv' @('--version')
if ($uv) { Add-Result 'uv (diagrams 0.25.1+)' 'Azure track' 'OK' $uv }
else { Add-Result 'uv (diagrams 0.25.1+)' 'Azure track' 'MISSING' 'Install: winget install --id astral-sh.uv -e' }
$dot = Get-FirstLine 'dot' @('-V')
if ($dot) { Add-Result 'Graphviz' 'Azure track' 'OK' $dot }
elseif (Test-Path -LiteralPath 'C:\Program Files\Graphviz\bin\dot.exe') { Add-Result 'Graphviz' 'Azure track' 'NOT ON PATH' "winget does not add it. Run: [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';C:\Program Files\Graphviz\bin', 'User'), then restart the terminal and your Copilot client" }
else { Add-Result 'Graphviz' 'Azure track' 'MISSING' 'Install (elevated): winget install --id Graphviz.Graphviz -e, then run this check again' }

# APM CLI - the VS Code client, and the Power Platform track's specialists (Part 07)
$apm = Get-FirstLine 'apm' @('--version')
if ($apm) {
    if ($apm -match '0\.29\.0') { Add-Result 'APM CLI' 'VS Code, Power Platform' 'OK' $apm }
    else { Add-Result 'APM CLI' 'VS Code, Power Platform' 'WRONG VERSION' "$apm - the workshop needs exactly 0.29.0" }
} else {
    Add-Result 'APM CLI' 'VS Code, Power Platform' 'NOT FOUND' 'Needed for VS Code, or to install the Power Platform specialists. Otherwise skip'
}

$results | Format-Table -AutoSize -Wrap

# Prepare Git for this folder. The .NET track compares the tests with the tag "starter".
function Invoke-StarterCommit {
    $identity = @('-c', 'commit.gpgsign=false')
    if (-not (git config user.email)) { $identity += @('-c', 'user.name=Northwind Workshop', '-c', 'user.email=workshop@northwind.example') }
    git -c core.safecrlf=false add -A 2>&1 | Out-Null
    git @identity commit -q -m "Northwind workshop starter" 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}
if ($git) {
    $isRepo = Test-Path -LiteralPath (Join-Path $root '.git')
    if (-not $isRepo) { git init -b main | Out-Null }
    git rev-parse -q --verify HEAD 2>$null | Out-Null
    $hasCommit = ($LASTEXITCODE -eq 0)
    git rev-parse -q --verify refs/tags/starter 2>$null | Out-Null
    $hasTag = ($LASTEXITCODE -eq 0)
    if ($hasTag) {
        Write-Host 'Git: repository ready, tag "starter" present. Nothing changed.' -ForegroundColor Green
    } elseif (-not $hasCommit) {
        if (Invoke-StarterCommit) {
            git tag starter | Out-Null
            Write-Host 'Git: repository created with a first commit of the starter files (tag "starter").' -ForegroundColor Green
        } else {
            Write-Host 'Git: the first commit failed. Fix the error shown by "git commit -m Starter", then run this script again.' -ForegroundColor Yellow
        }
    } else {
        $roots = @(git rev-list --max-parents=0 HEAD)
        if ($roots.Count -eq 1) {
            git tag starter $roots[0] | Out-Null
            Write-Host "Git: tag ""starter"" added to the first commit ($($roots[0].Substring(0,7)))." -ForegroundColor Green
        } else {
            Write-Host 'Git: no tag "starter" yet. Tag the commit that holds the original starter: git tag starter <commit>' -ForegroundColor Yellow
        }
    }
}

Write-Host ''
Write-Host 'Next: open this folder in your Copilot client and follow Part 01 of the guide.' -ForegroundColor Cyan
if (-not $git) { exit 1 }
exit 0
