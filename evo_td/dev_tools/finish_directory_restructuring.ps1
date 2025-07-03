# Script to finish moving remaining files to the new directory structure

$rootPath = "c:\Users\tradc\game_dev\evo_td\src"

# Create the destination directories if they don't exist
$directories = @(
    "$rootPath\game\components",
    "$rootPath\game\entities\Game",
    "$rootPath\game\entities\AttachmentFactory",
    "$rootPath\game\entities\TrainCarVoxel",
    "$rootPath\game\ui",
    "$rootPath\engine\scene"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Green
    }
}

# Define file moves
$fileMoves = @{
    # Components
    "$rootPath\components\StationPerimeterComponent.ts" = "$rootPath\game\components\StationPerimeterComponent.ts"
    "$rootPath\components\TrainCarVoxelComponent.ts" = "$rootPath\game\components\TrainCarVoxelComponent.ts"
    "$rootPath\components\TransformComponent.ts" = "$rootPath\engine\scene\TransformComponent.ts"
    
    # Entities
    "$rootPath\entities\AttachmentFactory.ts" = "$rootPath\game\entities\AttachmentFactory\AttachmentFactory.ts"
    "$rootPath\entities\Game.ts" = "$rootPath\game\entities\Game\Game.ts"
    
    # UI
    "$rootPath\ui\EventLogUI.ts" = "$rootPath\game\ui\EventLogUI.ts"
    "$rootPath\ui\TrainCarModificationUI.ts" = "$rootPath\game\ui\TrainCarModificationUI.ts"
}

# Move the files
foreach ($move in $fileMoves.GetEnumerator()) {
    $source = $move.Key
    $destination = $move.Value
    
    if (Test-Path $source) {
        if (-not (Test-Path $destination)) {
            Move-Item -Path $source -Destination $destination -Force
            Write-Host "Moved: $source -> $destination" -ForegroundColor Green
        } else {
            Write-Host "Skipping $source - destination already exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Source file not found: $source" -ForegroundColor Red
    }
}

# Update import paths
$importMappings = @{
    'from "../components/StationPerimeterComponent"' = 'from "../game/components/StationPerimeterComponent"'
    'from "../components/TrainCarVoxelComponent"' = 'from "../game/components/TrainCarVoxelComponent"'
    'from "../components/TransformComponent"' = 'from "../engine/scene/TransformComponent"'
    'from "../entities/AttachmentFactory"' = 'from "../game/entities/AttachmentFactory/AttachmentFactory"'
    'from "../entities/Game"' = 'from "../game/entities/Game/Game"'
    'from "../ui/EventLogUI"' = 'from "../game/ui/EventLogUI"'
    'from "../ui/TrainCarModificationUI"' = 'from "../game/ui/TrainCarModificationUI"'
    
    'from "../../components/StationPerimeterComponent"' = 'from "../../game/components/StationPerimeterComponent"'
    'from "../../components/TrainCarVoxelComponent"' = 'from "../../game/components/TrainCarVoxelComponent"'
    'from "../../components/TransformComponent"' = 'from "../../engine/scene/TransformComponent"'
    'from "../../entities/AttachmentFactory"' = 'from "../../game/entities/AttachmentFactory/AttachmentFactory"'
    'from "../../entities/Game"' = 'from "../../game/entities/Game/Game"'
    'from "../../ui/EventLogUI"' = 'from "../../game/ui/EventLogUI"'
    'from "../../ui/TrainCarModificationUI"' = 'from "../../game/ui/TrainCarModificationUI"'
}

# Get all TypeScript files
$files = Get-ChildItem -Path $rootPath -Recurse -Filter "*.ts" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*"
}

$processedFiles = 0
$modifiedFiles = 0

# Process each file
foreach ($file in $files) {
    $processedFiles++
    
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    foreach ($mapping in $importMappings.GetEnumerator()) {
        if ($content.Contains($mapping.Key)) {
            $content = $content.Replace($mapping.Key, $mapping.Value)
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated import paths in: $($file.FullName)" -ForegroundColor Green
        $modifiedFiles++
    }
}

# Remove empty directories
$dirsToCheck = @(
    "$rootPath\components",
    "$rootPath\entities",
    "$rootPath\renderers",
    "$rootPath\systems",
    "$rootPath\ui"
)

foreach ($dir in $dirsToCheck) {
    if (Test-Path $dir) {
        $isEmpty = (Get-ChildItem -Path $dir -Recurse | Measure-Object).Count -eq 0
        if ($isEmpty) {
            Remove-Item -Path $dir -Force
            Write-Host "Removed empty directory: $dir" -ForegroundColor Green
        } else {
            Write-Host "Directory not empty, cannot remove: $dir" -ForegroundColor Yellow
            Write-Host "Files remaining:" -ForegroundColor Yellow
            Get-ChildItem -Path $dir -Recurse | ForEach-Object {
                Write-Host "  - $($_.FullName)" -ForegroundColor Yellow
            }
        }
    }
}

Write-Host "Finished moving remaining files and updating import paths" -ForegroundColor Cyan
Write-Host "Files processed: $processedFiles" -ForegroundColor Cyan
Write-Host "Files with updated imports: $modifiedFiles" -ForegroundColor Cyan
