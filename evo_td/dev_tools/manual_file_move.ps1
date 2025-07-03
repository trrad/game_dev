$srcDir = "c:\Users\tradc\game_dev\evo_td\src"
$engineDir = "c:\Users\tradc\game_dev\evo_td\src\engine"
$gameDir = "c:\Users\tradc\game_dev\evo_td\src\game"

# Create directories if they don't exist
New-Item -Path "$engineDir\components" -ItemType Directory -Force | Out-Null
New-Item -Path "$gameDir\components" -ItemType Directory -Force | Out-Null
New-Item -Path "$gameDir\entities" -ItemType Directory -Force | Out-Null
New-Item -Path "$gameDir\renderers" -ItemType Directory -Force | Out-Null
New-Item -Path "$gameDir\systems" -ItemType Directory -Force | Out-Null

# Move components
Write-Host "Moving components to engine/components..."
$componentFiles = @(
    "PositionComponent.ts",
    "MovementComponent.ts",
    "TransformComponent.ts",
    "HealthComponent.ts",
    "RadiusComponent.ts"
)

foreach ($file in $componentFiles) {
    $sourcePath = "$srcDir\components\$file"
    $destPath = "$engineDir\components\$file"
    if (Test-Path $sourcePath) {
        Write-Host "Moving $file to engine/components"
        Move-Item -Path $sourcePath -Destination $destPath -Force
    }
}

Write-Host "Moving game-specific components to game/components..."
$gameComponentFiles = @(
    "AIBehaviorComponent.ts",
    "AttachmentSlotComponent.ts",
    "InventoryComponent.ts",
    "RailMovementComponent.ts",
    "RailPositionComponent.ts",
    "TrainCarPositionComponent.ts"
)

foreach ($file in $gameComponentFiles) {
    $sourcePath = "$srcDir\components\$file"
    $destPath = "$gameDir\components\$file"
    if (Test-Path $sourcePath) {
        Write-Host "Moving $file to game/components"
        Move-Item -Path $sourcePath -Destination $destPath -Force
    }
}

# Move entities
Write-Host "Moving entities to game/entities..."
$entityFiles = @(
    "Attachment.ts",
    "Building.ts",
    "CargoWarehouse.ts",
    "Rail.ts",
    "Train.ts",
    "TrainCar.ts",
    "TrainCarVoxel.ts"
)

foreach ($file in $entityFiles) {
    $sourcePath = "$srcDir\entities\$file"
    $destPath = "$gameDir\entities\$file"
    if (Test-Path $sourcePath) {
        Write-Host "Moving $file to game/entities"
        Move-Item -Path $sourcePath -Destination $destPath -Force
    }
}

# Move renderers
Write-Host "Moving renderers to game/renderers..."
$rendererFiles = @(
    "VoxelRenderComponent.ts"
)

foreach ($file in $rendererFiles) {
    $sourcePath = "$srcDir\renderers\$file"
    $destPath = "$gameDir\renderers\$file"
    if (Test-Path $sourcePath) {
        Write-Host "Moving $file to game/renderers"
        Move-Item -Path $sourcePath -Destination $destPath -Force
    }
}

# Move systems
Write-Host "Moving systems to game/systems..."
$systemFiles = @(
    "EnemySystem.ts",
    "ProjectileSystem.ts",
    "TrainSystem.ts"
)

foreach ($file in $systemFiles) {
    $sourcePath = "$srcDir\systems\$file"
    $destPath = "$gameDir\systems\$file"
    if (Test-Path $sourcePath) {
        Write-Host "Moving $file to game/systems"
        Move-Item -Path $sourcePath -Destination $destPath -Force
    }
}

Write-Host "File movement complete!"
