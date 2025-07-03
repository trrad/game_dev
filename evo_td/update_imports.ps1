# PowerShell script to bulk update import paths
# This script updates import paths from old structure to new engine/game structure

$rootPath = "c:\Users\tradc\game_dev\evo_td\src"

# Define path mappings
$pathMappings = @{
    "from '../core/Component'" = "from '../engine/core/Component'"
    "from '../core/GameObject'" = "from '../engine/core/GameObject'" 
    "from '../core/EventStack'" = "from '../engine/core/EventStack'"
    "from '../core/TimeManager'" = "from '../engine/core/TimeManager'"
    "from '../core/SceneManager'" = "from '../engine/scene/SceneManager'"
    "from '../utils/Logger'" = "from '../engine/utils/Logger'"
    "from '../utils/ObjectTracker'" = "from '../engine/utils/ObjectTracker'"
    "from '../utils/MathUtils'" = "from '../engine/utils/MathUtils'"
    "from '../utils/GeometryUtils'" = "from '../engine/utils/GeometryUtils'"
    "from '../core/ConfigManager'" = "from '../game/ConfigManager'"
    "from '../core/StationManager'" = "from '../game/StationManager'"
    "from '../utils/CSSLoader'" = "from '../ui/CSSLoader'"
    'from "./core/Component"' = 'from "./engine/core/Component"'
    'from "./core/GameObject"' = 'from "./engine/core/GameObject"'
    'from "./core/EventStack"' = 'from "./engine/core/EventStack"'
    'from "./core/TimeManager"' = 'from "./engine/core/TimeManager"'
    'from "./core/SceneManager"' = 'from "./engine/scene/SceneManager"'
    'from "./utils/Logger"' = 'from "./engine/utils/Logger"'
    'from "./utils/ObjectTracker"' = 'from "./engine/utils/ObjectTracker"'
    'from "./utils/MathUtils"' = 'from "./engine/utils/MathUtils"'
    'from "./utils/GeometryUtils"' = 'from "./engine/utils/GeometryUtils"'
    'from "./core/ConfigManager"' = 'from "./game/ConfigManager"'
    'from "./core/StationManager"' = 'from "./game/StationManager"'
    'from "./utils/CSSLoader"' = 'from "./ui/CSSLoader"'
}

Write-Host "Starting bulk import path updates..."
Write-Host "Root path: $rootPath"

# Get all TypeScript files
$files = Get-ChildItem -Path $rootPath -Recurse -Filter "*.ts" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*tests*" -and
    $_.FullName -notlike "*engine\core*" -and
    $_.FullName -notlike "*engine\scene*" -and
    $_.FullName -notlike "*engine\utils*"
}

$totalFiles = $files.Count
$processedFiles = 0
$modifiedFiles = 0

foreach ($file in $files) {
    $processedFiles++
    $relativePath = $file.FullName.Substring($rootPath.Length + 1)
    Write-Progress -Activity "Processing TypeScript files" -Status "Processing $relativePath" -PercentComplete (($processedFiles / $totalFiles) * 100)
    
    try {
        $content = Get-Content -Path $file.FullName -Raw
        $originalContent = $content
        
        # Apply all path mappings
        foreach ($mapping in $pathMappings.GetEnumerator()) {
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

Write-Host "`nBulk import update completed!" -ForegroundColor Cyan
Write-Host "Processed: $processedFiles files" -ForegroundColor White  
Write-Host "Modified: $modifiedFiles files" -ForegroundColor Green
