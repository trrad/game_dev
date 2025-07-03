# Hybrid directory restructuring script - Entity folders with co-located renderers

$rootPath = "c:\Users\tradc\game_dev\evo_td\src"

Write-Host "Starting hybrid directory restructuring..." -ForegroundColor Cyan

# Step 1: Create entity type folders
$entityTypes = @(
    "Train", 
    "TrainCar", 
    "TrainCarVoxel", 
    "Station", 
    "Enemy", 
    "Rail", 
    "Building", 
    "Attachment", 
    "Projectile",
    "CargoWarehouse"
)

# Create the core structure first
$coreDirs = @(
    "game\entities",
    "game\components",
    "game\systems",
    "game\renderers",
    "game\ui",
    "game\net",
    "engine\rendering"
)

foreach ($dir in $coreDirs) {
    $fullDir = "$rootPath\$dir"
    if (-not (Test-Path $fullDir)) {
        New-Item -ItemType Directory -Path $fullDir -Force | Out-Null
        Write-Host "Created directory: $fullDir" -ForegroundColor Green
    }
}

# Create entity-specific folders
foreach ($entityType in $entityTypes) {
    $entityDir = "$rootPath\game\entities\$entityType"
    if (-not (Test-Path $entityDir)) {
        New-Item -ItemType Directory -Path $entityDir -Force | Out-Null
        Write-Host "Created entity directory: $entityDir" -ForegroundColor Green
    }
}

# Step 2: Move entities to their folders
foreach ($entityType in $entityTypes) {
    # Move entity file
    $sourceFile = "$rootPath\entities\$entityType.ts"
    $destFile = "$rootPath\game\entities\$entityType\$entityType.ts"
    
    if (Test-Path $sourceFile) {
        if (-not (Test-Path $destFile)) {
            Move-Item -Path $sourceFile -Destination $destFile -Force
            Write-Host "Moved $entityType.ts to its subfolder" -ForegroundColor Green
        } else {
            Write-Host "Skipping $entityType.ts - destination already exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Entity file not found: $sourceFile" -ForegroundColor Yellow
    }
    
    # Move corresponding renderer if it exists
    $rendererFile = "$rootPath\renderers\${entityType}Renderer.ts"
    $rendererDest = "$rootPath\game\entities\$entityType\${entityType}Renderer.ts"
    
    if (Test-Path $rendererFile) {
        if (-not (Test-Path $rendererDest)) {
            Move-Item -Path $rendererFile -Destination $rendererDest -Force
            Write-Host "Moved ${entityType}Renderer.ts to entity subfolder" -ForegroundColor Green
        } else {
            Write-Host "Skipping ${entityType}Renderer.ts - destination already exists" -ForegroundColor Yellow
        }
    }
}

# Step 3: Move components to game/components
$componentsToMove = @(
    "HealthComponent.ts",
    "InventoryComponent.ts", 
    "AIBehaviorComponent.ts",
    "AttachmentComponent.ts",
    "AttachmentSlotComponent.ts", 
    "MovementComponent.ts", 
    "PositionComponent.ts",
    "RailMovementComponent.ts",
    "RailPositionComponent.ts",
    "TrainCarPositionComponent.ts"
)

foreach ($component in $componentsToMove) {
    $sourceFile = "$rootPath\components\$component"
    $destFile = "$rootPath\game\components\$component"
    
    if (Test-Path $sourceFile) {
        if (-not (Test-Path $destFile)) {
            Move-Item -Path $sourceFile -Destination $destFile -Force
            Write-Host "Moved $component to game/components" -ForegroundColor Green
        } else {
            Write-Host "Skipping $component - destination already exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Component file not found: $sourceFile" -ForegroundColor Yellow
    }
}

# Step 4: Move engine components
$engineComponents = @{
    "components\RadiusComponent.ts" = "engine\scene\RadiusComponent.ts"
}

foreach ($item in $engineComponents.GetEnumerator()) {
    $sourceFile = "$rootPath\$($item.Key)"
    $destFile = "$rootPath\$($item.Value)"
    $destDir = [System.IO.Path]::GetDirectoryName($destFile)
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    if (Test-Path $sourceFile) {
        if (-not (Test-Path $destFile)) {
            Move-Item -Path $sourceFile -Destination $destFile -Force
            Write-Host "Moved $($item.Key) to $($item.Value)" -ForegroundColor Green
        } else {
            Write-Host "Skipping $($item.Key) - destination already exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "File not found: $sourceFile" -ForegroundColor Yellow
    }
}

# Step 5: Move systems, UI, and net folders
$directoriesToMove = @{
    "systems\*" = "game\systems\"
    "ui\*" = "game\ui\"
    "net\*" = "game\net\"
}

foreach ($item in $directoriesToMove.GetEnumerator()) {
    $sourcePattern = "$rootPath\$($item.Key)"
    $destDir = "$rootPath\$($item.Value)"
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    $sourceFiles = Get-ChildItem -Path $sourcePattern -ErrorAction SilentlyContinue
    if ($sourceFiles) {
        foreach ($file in $sourceFiles) {
            $destFile = Join-Path -Path $destDir -ChildPath $file.Name
            
            if (-not (Test-Path $destFile)) {
                Move-Item -Path $file.FullName -Destination $destFile -Force
                Write-Host "Moved $($file.Name) to $($item.Value)" -ForegroundColor Green
            } else {
                Write-Host "Skipping $($file.Name) - destination already exists" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "No files found matching pattern: $sourcePattern" -ForegroundColor Yellow
    }
}

# Step 6: Move generic renderers to game/renderers
$genericRenderers = Get-ChildItem -Path "$rootPath\renderers\*.ts" -ErrorAction SilentlyContinue
if ($genericRenderers) {
    foreach ($file in $genericRenderers) {
        $destFile = "$rootPath\game\renderers\$($file.Name)"
        
        if (-not (Test-Path $destFile)) {
            Move-Item -Path $file.FullName -Destination $destFile -Force
            Write-Host "Moved $($file.Name) to game/renderers" -ForegroundColor Green
        } else {
            Write-Host "Skipping $($file.Name) - destination already exists" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No generic renderers found in $rootPath\renderers\" -ForegroundColor Yellow
}

# Step 7: Update import paths
$importMappings = @{
    'from "../components/HealthComponent"' = 'from "../game/components/HealthComponent"'
    'from "../components/InventoryComponent"' = 'from "../game/components/InventoryComponent"'
    'from "../components/MovementComponent"' = 'from "../game/components/MovementComponent"'
    'from "../components/PositionComponent"' = 'from "../game/components/PositionComponent"'
    'from "../components/RailMovementComponent"' = 'from "../game/components/RailMovementComponent"'
    'from "../components/RailPositionComponent"' = 'from "../game/components/RailPositionComponent"'
    'from "../components/TrainCarPositionComponent"' = 'from "../game/components/TrainCarPositionComponent"'
    'from "../components/AIBehaviorComponent"' = 'from "../game/components/AIBehaviorComponent"'
    'from "../components/AttachmentComponent"' = 'from "../game/components/AttachmentComponent"'
    'from "../components/AttachmentSlotComponent"' = 'from "../game/components/AttachmentSlotComponent"'
    'from "../components/RadiusComponent"' = 'from "../engine/scene/RadiusComponent"'
    
    # Entity imports
    'from "../entities/Train"' = 'from "../game/entities/Train/Train"'
    'from "../entities/TrainCar"' = 'from "../game/entities/TrainCar/TrainCar"'
    'from "../entities/TrainCarVoxel"' = 'from "../game/entities/TrainCarVoxel/TrainCarVoxel"'
    'from "../entities/Station"' = 'from "../game/entities/Station/Station"'
    'from "../entities/Enemy"' = 'from "../game/entities/Enemy/Enemy"'
    'from "../entities/Rail"' = 'from "../game/entities/Rail/Rail"'
    'from "../entities/Building"' = 'from "../game/entities/Building/Building"'
    'from "../entities/Attachment"' = 'from "../game/entities/Attachment/Attachment"'
    'from "../entities/Projectile"' = 'from "../game/entities/Projectile/Projectile"'
    'from "../entities/CargoWarehouse"' = 'from "../game/entities/CargoWarehouse/CargoWarehouse"'
    
    # Renderer imports
    'from "../renderers/StationRenderer"' = 'from "../game/entities/Station/StationRenderer"'
    'from "../renderers/TrainRenderer"' = 'from "../game/entities/Train/TrainRenderer"'
    'from "../renderers/TrainCarRenderer"' = 'from "../game/entities/TrainCar/TrainCarRenderer"'
    'from "../renderers/EnemyRenderer"' = 'from "../game/entities/Enemy/EnemyRenderer"'
    'from "../renderers/RailRenderer"' = 'from "../game/entities/Rail/RailRenderer"'
    'from "../renderers/BuildingRenderer"' = 'from "../game/entities/Building/BuildingRenderer"'
    'from "../renderers/ProjectileRenderer"' = 'from "../game/entities/Projectile/ProjectileRenderer"'
    'from "../renderers/GroundRenderer"' = 'from "../game/renderers/GroundRenderer"'
    'from "../renderers/LightRenderer"' = 'from "../game/renderers/LightRenderer"'
    
    # Systems, UI, Net
    'from "../systems/' = 'from "../game/systems/'
    'from "../ui/' = 'from "../game/ui/'
    'from "../net/' = 'from "../game/net/'
    
    # Two directory level up paths
    'from "../../components/HealthComponent"' = 'from "../../game/components/HealthComponent"'
    'from "../../components/InventoryComponent"' = 'from "../../game/components/InventoryComponent"'
    'from "../../components/MovementComponent"' = 'from "../../game/components/MovementComponent"'
    'from "../../components/PositionComponent"' = 'from "../../game/components/PositionComponent"'
    'from "../../components/RadiusComponent"' = 'from "../../engine/scene/RadiusComponent"'
    'from "../../entities/Train"' = 'from "../../game/entities/Train/Train"'
    'from "../../entities/TrainCar"' = 'from "../../game/entities/TrainCar/TrainCar"'
    'from "../../entities/TrainCarVoxel"' = 'from "../../game/entities/TrainCarVoxel/TrainCarVoxel"'
    'from "../../systems/' = 'from "../../game/systems/'
    'from "../../renderers/' = 'from "../../game/renderers/'
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
    Write-Host "Processing file $processedFiles of $($files.Count): $($file.Name)" -ForegroundColor Cyan
    
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    foreach ($mapping in $importMappings.GetEnumerator()) {
        if ($content.Contains($mapping.Key)) {
            $content = $content.Replace($mapping.Key, $mapping.Value)
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Updated import paths in: $($file.Name)" -ForegroundColor Green
        $modifiedFiles++
    }
}

# Remove empty directories
$dirsToCheck = @(
    "$rootPath\components",
    "$rootPath\entities",
    "$rootPath\renderers",
    "$rootPath\systems",
    "$rootPath\ui",
    "$rootPath\net"
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

Write-Host "Directory restructuring complete!" -ForegroundColor Cyan
Write-Host "Files processed: $processedFiles" -ForegroundColor Cyan
Write-Host "Files with updated imports: $modifiedFiles" -ForegroundColor Cyan
