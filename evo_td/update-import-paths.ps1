# Import path migration script for Train Trading Game refactoring
# This script updates import paths to match the new directory structure

# Define mapping for component import paths
$importMappings = @{
    # Components moved from src/components to src/engine/components
    "../components/PositionComponent" = "../engine/components/PositionComponent"
    "../components/MovementComponent" = "../engine/components/MovementComponent"
    "../components/HealthComponent" = "../engine/components/HealthComponent"
    "../components/RadiusComponent" = "../engine/components/RadiusComponent"
    
    # Components moved to game-specific locations
    "../components/RailPositionComponent" = "../game/components/RailPositionComponent"
    "../components/RailMovementComponent" = "../game/components/RailMovementComponent"
    "../components/TrainCarPositionComponent" = "../game/components/TrainCarPositionComponent"
    "../components/TrainCarVoxelComponent" = "../game/components/TrainCarVoxelComponent"
    "../components/AttachmentSlotComponent" = "../game/components/AttachmentSlotComponent"
    "../components/AIBehaviorComponent" = "../game/components/AIBehaviorComponent"
    "../components/InventoryComponent" = "../game/components/InventoryComponent"
    
    # Core files moved to engine
    "../engine/core/Component" = "../core/Component"
    "../engine/core/GameObject" = "../core/GameObject"
    "../engine/core/EventStack" = "../core/EventStack"
    "../engine/core/TimeManager" = "../core/TimeManager"
    
    # Scene files moved to engine/scene
    "../engine/scene/SceneNodeComponent" = "../engine/components/NodeComponent"
    "../engine/scene/RadiusComponent" = "../engine/components/RadiusComponent"
    "../engine/scene/SceneGraphEventSystem" = "../scene/SceneGraphEventSystem"
    "../engine/scene/SceneManager" = "../scene/SceneManager"
    
    # Utils moved to engine/utils
    "../engine/utils/Logger" = "../utils/Logger"
    "../engine/utils/MathUtils" = "../utils/MathUtils"
    "../engine/utils/GeometryUtils" = "../utils/GeometryUtils"
}

# Function to process a single file
function Update-ImportPaths {
    param(
        [string]$filePath
    )
    
    $content = Get-Content -Path $filePath -Raw
    # Store original for comparison
    $modified = $false
    
    foreach ($oldPath in $importMappings.Keys) {
        $newPath = $importMappings[$oldPath]
        
        # Look for import patterns with the old path
        $pattern = "import\s+(?:{[^}]+}\s+)?from\s+['\`"]$oldPath['\`"]"
        if ($content -match $pattern) {
            $content = $content -replace $pattern, "import `$1 from `"$newPath`""
            $modified = $true
            Write-Host "Updated import in $filePath - replaced with $newPath"
        }
    }
    
    # Save changes if modified
    if ($modified) {
        $content | Set-Content -Path $filePath -NoNewline
        Write-Host "Updated $filePath"
    }
}

# Process all TypeScript files in the engine directory
$files = Get-ChildItem -Path "c:/Users/tradc/game_dev/evo_td/src" -Filter "*.ts" -Recurse
foreach ($file in $files) {
    Update-ImportPaths -filePath $file.FullName
}

Write-Host "Import path migration complete."
