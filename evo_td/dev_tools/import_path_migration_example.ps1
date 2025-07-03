# Example: Import Path Migration Script
# This script demonstrates using the batch file updater template for import path refactoring
# Based on the successful engine/game directory migration

# Define the root path (modify as needed)
$rootPath = "c:\Users\tradc\game_dev\evo_td\src"

# Define import path mappings for engine/game separation
$importMappings = @{
    # Core engine components
    'from "../core/GameObject"' = 'from "../engine/core/GameObject"'
    'from "../core/Component"' = 'from "../engine/core/Component"'
    'from "../core/EventStack"' = 'from "../engine/core/EventStack"'
    'from "../core/TimeManager"' = 'from "../engine/core/TimeManager"'
    'from "../core/SceneManager"' = 'from "../engine/scene/SceneManager"'
    
    # Engine utilities
    'from "../utils/Logger"' = 'from "../engine/utils/Logger"'
    'from "../utils/ObjectTracker"' = 'from "../engine/utils/ObjectTracker"'
    'from "../utils/MathUtils"' = 'from "../engine/utils/MathUtils"'
    'from "../utils/GeometryUtils"' = 'from "../engine/utils/GeometryUtils"'
    
    # Game-specific files
    'from "../core/StationManager"' = 'from "../game/StationManager"'
    'from "../core/ConfigManager"' = 'from "../game/ConfigManager"'
    
    # UI-specific files
    'from "../utils/CSSLoader"' = 'from "../ui/CSSLoader"'
    
    # Handle nested directory imports (../../ paths)
    'from "../../core/SceneManager"' = 'from "../../engine/scene/SceneManager"'
    'from "../../core/GameObject"' = 'from "../../engine/core/GameObject"'
    'from "../../core/Component"' = 'from "../../engine/core/Component"'
    'from "../../utils/Logger"' = 'from "../../engine/utils/Logger"'
    'from "../../core/EventStack"' = 'from "../../engine/core/EventStack"'
    'from "../../core/TimeManager"' = 'from "../../engine/core/TimeManager"'
    'from "../../utils/ObjectTracker"' = 'from "../../engine/utils/ObjectTracker"'
}

Write-Host "Import Path Migration Script" -ForegroundColor Cyan
Write-Host "This will update import paths to use the new engine/game directory structure" -ForegroundColor Yellow
Write-Host ""
Write-Host "Mappings to apply:" -ForegroundColor White
foreach ($mapping in $importMappings.GetEnumerator()) {
    Write-Host "  $($mapping.Key) -> $($mapping.Value)" -ForegroundColor Gray
}
Write-Host ""

# Confirm before proceeding
$confirmation = Read-Host "Do you want to proceed? (y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit
}

# Call the template script
$templatePath = Join-Path $PSScriptRoot "batch_file_updater_template.ps1"

if (Test-Path $templatePath) {
    & $templatePath -RootPath $rootPath -PathMappings $importMappings -LogFile "import_migration.log"
} else {
    Write-Host "Template script not found at: $templatePath" -ForegroundColor Red
    Write-Host "Please ensure batch_file_updater_template.ps1 is in the same directory." -ForegroundColor Red
}

Write-Host ""
Write-Host "Import migration completed. Check the log file and build status to verify results." -ForegroundColor Green
