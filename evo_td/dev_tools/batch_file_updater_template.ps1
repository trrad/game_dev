# PowerShell Batch File Update Template
# Generalized template for systematic code refactoring across multiple files
# Based on the successful import path migration pattern

param(
    [Parameter(Mandatory=$true)]
    [string]$RootPath,
    
    [Parameter(Mandatory=$true)]
    [hashtable]$PathMappings,
    
    [Parameter(Mandatory=$false)]
    [string[]]$FilePatterns = @("*.ts", "*.js", "*.tsx", "*.jsx"),
    
    [Parameter(Mandatory=$false)]
    [string[]]$ExcludePatterns = @("*node_modules*", "*dist*", "*build*", "*.min.*"),
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [string]$LogFile = $null
)

# Initialize logging
if ($LogFile) {
    $logPath = Join-Path $RootPath $LogFile
    "=== Batch Update Started: $(Get-Date) ===" | Out-File -FilePath $logPath -Encoding UTF8
}

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
    if ($LogFile) {
        $Message | Out-File -FilePath $logPath -Append -Encoding UTF8
    }
}

Write-Log "Starting batch file update..." "Cyan"
Write-Log "Root Path: $RootPath"
Write-Log "Patterns to update: $($PathMappings.Count)"
Write-Log "File patterns: $($FilePatterns -join ', ')"
Write-Log "Exclude patterns: $($ExcludePatterns -join ', ')"

if ($DryRun) {
    Write-Log "DRY RUN MODE - No files will be modified" "Yellow"
}

# Get all files matching patterns and exclusions
$allFiles = @()
foreach ($pattern in $FilePatterns) {
    $files = Get-ChildItem -Path $RootPath -Recurse -Filter $pattern
    $allFiles += $files
}

# Apply exclusions
$filteredFiles = $allFiles | Where-Object { 
    $filePath = $_.FullName
    $excluded = $false
    foreach ($excludePattern in $ExcludePatterns) {
        if ($filePath -like $excludePattern) {
            $excluded = $true
            break
        }
    }
    return -not $excluded
}

$totalFiles = $filteredFiles.Count
$processedFiles = 0
$modifiedFiles = 0
$modifiedFilesList = @()

Write-Log "Found $totalFiles files to process"

foreach ($file in $filteredFiles) {
    $processedFiles++
    $relativePath = $file.FullName.Substring($RootPath.Length + 1)
    
    Write-Progress -Activity "Processing files" -Status "Processing $relativePath" -PercentComplete (($processedFiles / $totalFiles) * 100)
    
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        $originalContent = $content
        
        # Apply all path mappings
        foreach ($mapping in $PathMappings.GetEnumerator()) {
            $content = $content -replace [regex]::Escape($mapping.Key), $mapping.Value
        }
        
        # Check if content changed
        if ($content -ne $originalContent) {
            if (-not $DryRun) {
                Set-Content -Path $file.FullName -Value $content -NoNewline
            }
            $modifiedFiles++
            $modifiedFilesList += $relativePath
            Write-Log "Modified: $relativePath" "Green"
        }
    }
    catch {
        Write-Log "Error processing $relativePath : $($_.Exception.Message)" "Red"
    }
}

Write-Progress -Activity "Processing files" -Completed

Write-Log "`nBatch update completed!" "Cyan"
Write-Log "Processed: $processedFiles files" "White"
Write-Log "Modified: $modifiedFiles files" "Green"

if ($DryRun) {
    Write-Log "`nDRY RUN - No files were actually modified" "Yellow"
    Write-Log "To apply changes, run without -DryRun flag" "Yellow"
}

if ($modifiedFiles -gt 0) {
    Write-Log "`nModified files:"
    foreach ($file in $modifiedFilesList) {
        Write-Log "  - $file"
    }
}

if ($LogFile) {
    Write-Log "`nLog saved to: $logPath"
    "=== Batch Update Completed: $(Get-Date) ===" | Out-File -FilePath $logPath -Append -Encoding UTF8
}

# Example usage:
# $mappings = @{
#     'from "../core/GameObject"' = 'from "../engine/core/GameObject"'
#     'from "../utils/Logger"' = 'from "../engine/utils/Logger"'
# }
# .\batch_file_updater.ps1 -RootPath "c:\path\to\src" -PathMappings $mappings -DryRun
