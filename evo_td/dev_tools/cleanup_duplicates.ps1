# Cleanup script to resolve duplicate files and finalize directory structure

Write-Host "Starting cleanup of duplicate files and finalizing directory structure..." -ForegroundColor Cyan

# 1. Move remaining files from src/components to appropriate locations
$componentsToMove = @{
    ".\src\components\StationPerimeterComponent.ts" = ".\src\game\components\StationPerimeterComponent.ts"
    ".\src\components\TrainCarVoxelComponent.ts" = ".\src\game\components\TrainCarVoxelComponent.ts"
    ".\src\components\TransformComponent.ts" = ".\src\engine\scene\TransformComponent.ts"
}

foreach ($source in $componentsToMove.Keys) {
    $dest = $componentsToMove[$source]
    if (Test-Path $source) {
        # Check if destination exists
        if (Test-Path $dest) {
            Write-Host "Destination already exists, comparing files: $dest" -ForegroundColor Yellow
            $sourceContent = Get-Content -Path $source -Raw
            $destContent = Get-Content -Path $dest -Raw
            
            if ($sourceContent -eq $destContent) {
                Write-Host "Files are identical, removing source: $source" -ForegroundColor Green
                Remove-Item -Path $source
            } else {
                Write-Host "Files differ, renaming source to .bak: $source" -ForegroundColor Yellow
                Rename-Item -Path $source -NewName "$source.bak"
            }
        } else {
            # Destination doesn't exist, just move it
            Write-Host "Moving $source to $dest" -ForegroundColor Green
            $destDir = [System.IO.Path]::GetDirectoryName($dest)
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Move-Item -Path $source -Destination $dest -Force
        }
    } else {
        Write-Host "Source file not found: $source" -ForegroundColor Red
    }
}

# 2. Move the Game.ts file from src/entities to game/entities/Game
$gameSrc = ".\src\entities\Game.ts"
$gameDest = ".\src\game\entities\Game\Game.ts"
if (Test-Path $gameSrc) {
    $gameDestDir = [System.IO.Path]::GetDirectoryName($gameDest)
    if (-not (Test-Path $gameDestDir)) {
        New-Item -ItemType Directory -Path $gameDestDir -Force | Out-Null
    }
    
    if (Test-Path $gameDest) {
        Write-Host "Game.ts already exists at destination, comparing files" -ForegroundColor Yellow
        $sourceContent = Get-Content -Path $gameSrc -Raw
        $destContent = Get-Content -Path $gameDest -Raw
        
        if ($sourceContent -eq $destContent) {
            Write-Host "Files are identical, removing source: $gameSrc" -ForegroundColor Green
            Remove-Item -Path $gameSrc
        } else {
            Write-Host "Files differ, renaming source to .bak: $gameSrc" -ForegroundColor Yellow
            Rename-Item -Path $gameSrc -NewName "$gameSrc.bak"
        }
    } else {
        Write-Host "Moving $gameSrc to $gameDest" -ForegroundColor Green
        Move-Item -Path $gameSrc -Destination $gameDest -Force
    }
} else {
    Write-Host "Game.ts not found at $gameSrc" -ForegroundColor Yellow
}

# 3. Clean up duplicate components
$duplicateComponents = @(
    ".\src\engine\components\HealthComponent.ts",
    ".\src\engine\components\MovementComponent.ts",
    ".\src\engine\components\PositionComponent.ts"
)

foreach ($file in $duplicateComponents) {
    if (Test-Path $file) {
        $basename = [System.IO.Path]::GetFileName($file)
        $gameComponent = ".\src\game\components\$basename"
        
        if (Test-Path $gameComponent) {
            Write-Host "Component exists in both engine and game, checking if identical: $basename" -ForegroundColor Yellow
            $engineContent = Get-Content -Path $file -Raw
            $gameContent = Get-Content -Path $gameComponent -Raw
            
            if ($engineContent -eq $gameContent) {
                Write-Host "Files are identical, removing engine version: $file" -ForegroundColor Green
                Remove-Item -Path $file
            } else {
                Write-Host "Files differ, renaming engine version to .duplicate: $file" -ForegroundColor Yellow
                Rename-Item -Path $file -NewName "$file.duplicate"
            }
        }
    }
}

# 4. Clean up duplicate entities
$duplicateEntities = @(
    ".\src\game\entities\Attachment.ts",
    ".\src\game\entities\Building.ts",
    ".\src\game\entities\Rail.ts",
    ".\src\game\entities\Train.ts",
    ".\src\game\entities\TrainCar.ts",
    ".\src\game\entities\TrainCarVoxel.ts"
)

foreach ($file in $duplicateEntities) {
    if (Test-Path $file) {
        $basename = [System.IO.Path]::GetFileName($file)
        $entityName = $basename -replace ".ts", ""
        $folderEntity = ".\src\game\entities\$entityName\$basename"
        
        if (Test-Path $folderEntity) {
            Write-Host "Entity exists in both flat structure and folder structure: $basename" -ForegroundColor Yellow
            $flatContent = Get-Content -Path $file -Raw
            $folderContent = Get-Content -Path $folderEntity -Raw
            
            if ($flatContent -eq $folderContent) {
                Write-Host "Files are identical, removing flat version: $file" -ForegroundColor Green
                Remove-Item -Path $file
            } else {
                Write-Host "Files differ, renaming flat version to .duplicate: $file" -ForegroundColor Yellow
                Rename-Item -Path $file -NewName "$file.duplicate"
            }
        }
    }
}

# 5. Clean up duplicate files in Attachment folder
$attachmentDuplicates = @{
    ".\src\game\entities\Attachment\AttachmentFactory.ts" = ".\src\game\entities\AttachmentFactory\AttachmentFactory.ts"
    ".\src\game\entities\Attachment\AttachmentSlotFactory.ts" = ".\src\game\entities\AttachmentSlotFactory\AttachmentSlotFactory.ts"
}

foreach ($source in $attachmentDuplicates.Keys) {
    $dest = $attachmentDuplicates[$source]
    if (Test-Path $source -and (Test-Path $dest)) {
        Write-Host "Found duplicate attachment files, comparing: $source and $dest" -ForegroundColor Yellow
        $sourceContent = Get-Content -Path $source -Raw
        $destContent = Get-Content -Path $dest -Raw
        
        if ($sourceContent -eq $destContent) {
            Write-Host "Files are identical, keeping only one version" -ForegroundColor Green
            Remove-Item -Path $dest
        } else {
            Write-Host "Files differ, renaming second version to .duplicate: $dest" -ForegroundColor Yellow
            Rename-Item -Path $dest -NewName "$dest.duplicate"
        }
    }
}

# 6. Check if we can remove the old directories
$oldDirs = @(
    ".\src\components",
    ".\src\entities",
    ".\src\systems",
    ".\src\renderers",
    ".\src\ui",
    ".\src\net",
    ".\src\core"
)

foreach ($dir in $oldDirs) {
    if (Test-Path $dir) {
        $isEmpty = (Get-ChildItem -Path $dir -Recurse -Force | Where-Object { !$_.PSIsContainer } | Measure-Object).Count -eq 0
        if ($isEmpty) {
            Write-Host "Removing empty directory: $dir" -ForegroundColor Green
            Remove-Item -Path $dir -Force -Recurse
        } else {
            Write-Host "Directory not empty, files remaining in: $dir" -ForegroundColor Yellow
            Get-ChildItem -Path $dir -Recurse -Force | Where-Object { !$_.PSIsContainer } | ForEach-Object {
                Write-Host "  - $($_.FullName)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Directory already removed: $dir" -ForegroundColor Green
    }
}

# 7. Clean up TransformComponent duplicate in engine/scene
$transformDuplicate = ".\src\engine\scene\TransformComponent.ts"
$sceneNodeComponent = ".\src\engine\scene\SceneNodeComponent.ts"

if ((Test-Path $transformDuplicate) -and (Test-Path $sceneNodeComponent)) {
    Write-Host "Found both TransformComponent and SceneNodeComponent in scene folder" -ForegroundColor Yellow
    Write-Host "Checking if TransformComponent is just an old version that should be removed..." -ForegroundColor Yellow
    
    $transformContent = Get-Content -Path $transformDuplicate -Raw
    if ($transformContent -match "export class TransformComponent") {
        Write-Host "TransformComponent appears to be a legacy file, renaming to .legacy" -ForegroundColor Yellow
        Rename-Item -Path $transformDuplicate -NewName "$transformDuplicate.legacy"
    }
}

Write-Host "Cleanup completed!" -ForegroundColor Cyan
