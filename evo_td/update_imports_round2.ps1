# PowerShell script to fix additional import patterns
$rootPath = "c:\Users\tradc\game_dev\evo_td\src"

# Additional path mappings for remaining issues
$additionalMappings = @{
    'from "../core/GameObject"' = 'from "../engine/core/GameObject"'
    'from "../core/Component"' = 'from "../engine/core/Component"'
    'from "../core/EventStack"' = 'from "../engine/core/EventStack"'
    'from "../core/TimeManager"' = 'from "../engine/core/TimeManager"'
    'from "../core/SceneManager"' = 'from "../engine/scene/SceneManager"'
    'from "../utils/Logger"' = 'from "../engine/utils/Logger"'
    'from "../utils/ObjectTracker"' = 'from "../engine/utils/ObjectTracker"'
    'from "../utils/MathUtils"' = 'from "../engine/utils/MathUtils"'
    'from "../utils/GeometryUtils"' = 'from "../engine/utils/GeometryUtils"'
    'from "../utils/CSSLoader"' = 'from "../ui/CSSLoader"'
    'from "../core/StationManager"' = 'from "../game/StationManager"'
    'from "../core/ConfigManager"' = 'from "../game/ConfigManager"'
    'from "../../core/SceneManager"' = 'from "../../engine/scene/SceneManager"'
    'from "../../core/GameObject"' = 'from "../../engine/core/GameObject"'
    'from "../../core/Component"' = 'from "../../engine/core/Component"'
    'from "../../utils/Logger"' = 'from "../../engine/utils/Logger"'
    'from "../../core/EventStack"' = 'from "../../engine/core/EventStack"'
    'from "../../core/TimeManager"' = 'from "../../engine/core/TimeManager"'
    'from "../../utils/ObjectTracker"' = 'from "../../engine/utils/ObjectTracker"'
}

Write-Host "Starting second round of import path updates..."

# Get all TypeScript files except engine core ones
$files = Get-ChildItem -Path $rootPath -Recurse -Filter "*.ts" | Where-Object { 
    $_.FullName -notlike "*node_modules*"
}

$totalFiles = $files.Count
$processedFiles = 0
$modifiedFiles = 0

foreach ($file in $files) {
    $processedFiles++
    $relativePath = $file.FullName.Substring($rootPath.Length + 1)
    Write-Progress -Activity "Processing TypeScript files (Round 2)" -Status "Processing $relativePath" -PercentComplete (($processedFiles / $totalFiles) * 100)
    
    try {
        $content = Get-Content -Path $file.FullName -Raw
        $originalContent = $content
        
        # Apply all additional path mappings
        foreach ($mapping in $additionalMappings.GetEnumerator()) {
            $content = $content -replace [regex]::Escape($mapping.Key), $mapping.Value
        }
        
        # Write back if content changed
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $modifiedFiles++
            Write-Host "Modified: $relativePath" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Error processing $relativePath : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nSecond round import update completed!" -ForegroundColor Cyan
Write-Host "Processed: $processedFiles files" -ForegroundColor White  
Write-Host "Modified: $modifiedFiles files" -ForegroundColor Green
