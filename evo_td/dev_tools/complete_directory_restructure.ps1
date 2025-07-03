# Complete directory restructuring script to move remaining files

$rootPath = "c:\Users\tradc\game_dev\evo_td\src"

Write-Host "Moving remaining files to proper directories..." -ForegroundColor Cyan

# Create the entity folders if they don't exist
$entityTypes = @(
    "Attachment",
    "Building",
    "CargoWarehouse",
    "Enemy",
    "Game",
    "Rail",
    "Train",
    "TrainCar",
    "TrainCarVoxel",
    "Weapon"
)

foreach ($entityType in $entityTypes) {
    $entityDir = "$rootPath\game\entities\$entityType"
    if (-not (Test-Path $entityDir)) {
        New-Item -ItemType Directory -Path $entityDir -Force | Out-Null
        Write-Host "Created entity directory: $entityDir" -ForegroundColor Green
    }
}

# Move remaining entity files to their folders
$entityMappings = @{
    "entities\Attachment.ts" = "game\entities\Attachment\Attachment.ts"
    "entities\AttachmentFactory.ts" = "game\entities\Attachment\AttachmentFactory.ts"
    "entities\AttachmentSlotFactory.ts" = "game\entities\Attachment\AttachmentSlotFactory.ts"
    "entities\Building.ts" = "game\entities\Building\Building.ts"
    "entities\CargoWarehouse.ts" = "game\entities\CargoWarehouse\CargoWarehouse.ts"
    "entities\Game.ts" = "game\entities\Game\Game.ts"
    "entities\Rail.ts" = "game\entities\Rail\Rail.ts"
    "entities\Train.ts" = "game\entities\Train\Train.ts"
    "entities\TrainCar.ts" = "game\entities\TrainCar\TrainCar.ts"
    "entities\TrainCarVoxel.ts" = "game\entities\TrainCarVoxel\TrainCarVoxel.ts"
    "entities\Weapon.ts" = "game\entities\Weapon\Weapon.ts"
}

foreach ($mapping in $entityMappings.GetEnumerator()) {
    $sourcePath = "$rootPath\$($mapping.Key)"
    $destPath = "$rootPath\$($mapping.Value)"
    $destDir = Split-Path -Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    if (Test-Path $sourcePath) {
        if (-not (Test-Path $destPath)) {
            Write-Host "Moving $($mapping.Key) to $($mapping.Value)" -ForegroundColor Green
            Move-Item -Path $sourcePath -Destination $destPath -Force
        } else {
            Write-Host "Skipping $($mapping.Key) - destination already exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Source file not found: $sourcePath" -ForegroundColor Yellow
    }
}

# Move remaining components to appropriate locations
$componentMappings = @{
    "components\StationPerimeterComponent.ts" = "game\components\StationPerimeterComponent.ts"
    "components\TrainCarPositionComponent.ts" = "game\components\TrainCarPositionComponent.ts"
    "components\TrainCarVoxelComponent.ts" = "game\components\TrainCarVoxelComponent.ts"
}

foreach ($mapping in $componentMappings.GetEnumerator()) {
    $sourcePath = "$rootPath\$($mapping.Key)"
    $destPath = "$rootPath\$($mapping.Value)"
    $destDir = Split-Path -Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    if (Test-Path $sourcePath) {
        if (-not (Test-Path $destPath)) {
            Write-Host "Moving $($mapping.Key) to $($mapping.Value)" -ForegroundColor Green
            Move-Item -Path $sourcePath -Destination $destPath -Force
        } else {
            Write-Host "Skipping $($mapping.Key) - destination already exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Source file not found: $sourcePath" -ForegroundColor Yellow
    }
}

# Move remaining renderer files
$rendererMappings = @{
    "renderers\VoxelRenderComponent.ts" = "game\renderers\VoxelRenderComponent.ts"
}

foreach ($mapping in $rendererMappings.GetEnumerator()) {
    $sourcePath = "$rootPath\$($mapping.Key)"
    $destPath = "$rootPath\$($mapping.Value)"
    $destDir = Split-Path -Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    if (Test-Path $sourcePath) {
        if (-not (Test-Path $destPath)) {
            Write-Host "Moving $($mapping.Key) to $($mapping.Value)" -ForegroundColor Green
            Move-Item -Path $sourcePath -Destination $destPath -Force
        } else {
            Write-Host "Skipping $($mapping.Key) - destination already exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Source file not found: $sourcePath" -ForegroundColor Yellow
    }
}

# Move remaining system files
$systemMappings = @{
    "systems\EnemySystem.ts" = "game\systems\EnemySystem.ts"
    "systems\ProjectileSystem.ts" = "game\systems\ProjectileSystem.ts"
    "systems\TrainSystem.ts" = "game\systems\TrainSystem.ts"
}

foreach ($mapping in $systemMappings.GetEnumerator()) {
    $sourcePath = "$rootPath\$($mapping.Key)"
    $destPath = "$rootPath\$($mapping.Value)"
    $destDir = Split-Path -Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    if (Test-Path $sourcePath) {
        if (-not (Test-Path $destPath)) {
            Write-Host "Moving $($mapping.Key) to $($mapping.Value)" -ForegroundColor Green
            Move-Item -Path $sourcePath -Destination $destPath -Force
        } else {
            Write-Host "Skipping $($mapping.Key) - destination already exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Source file not found: $sourcePath" -ForegroundColor Yellow
    }
}

# Update import paths
$importMappings = @{
    'from "../components/StationPerimeterComponent"' = 'from "../game/components/StationPerimeterComponent"'
    'from "../components/TrainCarVoxelComponent"' = 'from "../game/components/TrainCarVoxelComponent"'
    'from "../entities/AttachmentFactory"' = 'from "../game/entities/Attachment/AttachmentFactory"'
    'from "../entities/AttachmentSlotFactory"' = 'from "../game/entities/Attachment/AttachmentSlotFactory"'
    'from "../entities/Weapon"' = 'from "../game/entities/Weapon/Weapon"'
    'from "../entities/CargoWarehouse"' = 'from "../game/entities/CargoWarehouse/CargoWarehouse"'
    'from "../entities/Game"' = 'from "../game/entities/Game/Game"'
    'from "../renderers/VoxelRenderComponent"' = 'from "../game/renderers/VoxelRenderComponent"'
    
    # Two-level paths
    'from "../../components/StationPerimeterComponent"' = 'from "../../game/components/StationPerimeterComponent"'
    'from "../../components/TrainCarVoxelComponent"' = 'from "../../game/components/TrainCarVoxelComponent"'
    'from "../../entities/AttachmentFactory"' = 'from "../../game/entities/Attachment/AttachmentFactory"'
    'from "../../entities/AttachmentSlotFactory"' = 'from "../../game/entities/Attachment/AttachmentSlotFactory"'
    'from "../../entities/Weapon"' = 'from "../../game/entities/Weapon/Weapon"'
    'from "../../entities/CargoWarehouse"' = 'from "../../game/entities/CargoWarehouse/CargoWarehouse"'
    'from "../../entities/Game"' = 'from "../../game/entities/Game/Game"'
    'from "../../renderers/VoxelRenderComponent"' = 'from "../../game/renderers/VoxelRenderComponent"'
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
    Write-Progress -Activity "Updating import paths" -Status "Processing file $processedFiles of $($files.Count)" -PercentComplete (($processedFiles / $files.Count) * 100)
    
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    foreach ($mapping in $importMappings.GetEnumerator()) {
        if ($content.Contains($mapping.Key)) {
            $content = $content.Replace($mapping.Key, $mapping.Value)
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated import paths in: $($file.Name)" -ForegroundColor Green
        $modifiedFiles++
    }
}

# Check if there are any remaining files in old directories and display them
$oldDirs = @(
    "$rootPath\components",
    "$rootPath\entities",
    "$rootPath\renderers",
    "$rootPath\systems"
)

foreach ($dir in $oldDirs) {
    if (Test-Path $dir) {
        $remainingFiles = Get-ChildItem -Path $dir -Recurse | Measure-Object
        if ($remainingFiles.Count -gt 0) {
            Write-Host "Warning: $($remainingFiles.Count) files still remain in $dir" -ForegroundColor Yellow
            Get-ChildItem -Path $dir -Recurse | ForEach-Object {
                Write-Host "  - $($_.Name)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Directory $dir is empty and can be removed" -ForegroundColor Green
            Remove-Item -Path $dir -Force
        }
    }
}

Write-Host "Remaining file movement complete!" -ForegroundColor Cyan
Write-Host "Files processed: $processedFiles" -ForegroundColor Cyan
Write-Host "Files with updated imports: $modifiedFiles" -ForegroundColor Cyan
