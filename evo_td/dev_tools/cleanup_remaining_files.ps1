# Cleanup remaining files script

$srcPath = "c:\Users\tradc\game_dev\evo_td\src"

# Move remaining components to game/components
$filesToMove = @(
    @{ source = "$srcPath\components\StationPerimeterComponent.ts"; destination = "$srcPath\game\components\StationPerimeterComponent.ts" },
    @{ source = "$srcPath\components\TrainCarVoxelComponent.ts"; destination = "$srcPath\game\components\TrainCarVoxelComponent.ts" }
)

# Special case for TransformComponent - check if it should be moved or deleted
$transformComponentSource = "$srcPath\components\TransformComponent.ts"
$transformComponentDestination = "$srcPath\engine\scene\TransformComponent.ts"

# Move files that still exist
foreach ($file in $filesToMove) {
    if (Test-Path $file.source) {
        if (!(Test-Path $file.destination)) {
            Copy-Item -Path $file.source -Destination $file.destination -Force
            Write-Host "Moved $($file.source) to $($file.destination)" -ForegroundColor Green
            Remove-Item -Path $file.source -Force
        } else {
            Write-Host "Destination already exists, checking content: $($file.destination)" -ForegroundColor Yellow
            $sourceContent = Get-Content -Path $file.source -Raw
            $destContent = Get-Content -Path $file.destination -Raw
            
            if ($sourceContent -eq $destContent) {
                Write-Host "Files are identical, removing source file" -ForegroundColor Green
                Remove-Item -Path $file.source -Force
            } else {
                Write-Host "Files have different content! Manual review needed" -ForegroundColor Red
                Write-Host "Source: $($file.source)" -ForegroundColor Red
                Write-Host "Destination: $($file.destination)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "Source file not found: $($file.source)" -ForegroundColor Yellow
    }
}

# Handle TransformComponent - check if it needs to be renamed to SceneNodeComponent or is a duplicate
if (Test-Path $transformComponentSource) {
    $sceneNodeComponentPath = "$srcPath\engine\scene\SceneNodeComponent.ts"
    if (Test-Path $sceneNodeComponentPath) {
        $transformContent = Get-Content -Path $transformComponentSource -Raw
        $sceneNodeContent = Get-Content -Path $sceneNodeComponentPath -Raw
        
        # If the files are similar, delete the TransformComponent
        # This is a simplistic check; in reality you'd need a more sophisticated comparison
        if ($transformContent.Contains("extends Component") -and $sceneNodeContent.Contains("extends Component")) {
            Write-Host "TransformComponent appears to be superseded by SceneNodeComponent, removing" -ForegroundColor Green
            Remove-Item -Path $transformComponentSource -Force
        } else {
            Write-Host "TransformComponent appears different from SceneNodeComponent, moving to engine/scene" -ForegroundColor Yellow
            if (!(Test-Path $transformComponentDestination)) {
                Copy-Item -Path $transformComponentSource -Destination $transformComponentDestination -Force
                Remove-Item -Path $transformComponentSource -Force
                Write-Host "Moved TransformComponent to engine/scene" -ForegroundColor Green
            } else {
                Write-Host "TransformComponent destination already exists! Manual review needed" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "SceneNodeComponent doesn't exist, moving TransformComponent" -ForegroundColor Yellow
        Copy-Item -Path $transformComponentSource -Destination $transformComponentDestination -Force
        Remove-Item -Path $transformComponentSource -Force
        Write-Host "Moved TransformComponent to engine/scene" -ForegroundColor Green
    }
}

# Check if we can remove the empty components directory
if (Test-Path "$srcPath\components") {
    $remainingFiles = Get-ChildItem -Path "$srcPath\components" -Recurse
    if ($remainingFiles.Count -eq 0) {
        Remove-Item -Path "$srcPath\components" -Force
        Write-Host "Removed empty components directory" -ForegroundColor Green
    } else {
        Write-Host "Components directory not empty, files remaining:" -ForegroundColor Yellow
        foreach ($file in $remainingFiles) {
            Write-Host "  - $($file.FullName)" -ForegroundColor Yellow
        }
    }
}

# Check if there are files in entities, renderers, etc. that should be moved
$oldDirectories = @("entities", "renderers", "systems", "utils", "ui", "net", "core")

foreach ($dir in $oldDirectories) {
    if (Test-Path "$srcPath\$dir") {
        $remainingFiles = Get-ChildItem -Path "$srcPath\$dir" -Recurse
        if ($remainingFiles.Count -eq 0) {
            Remove-Item -Path "$srcPath\$dir" -Force
            Write-Host "Removed empty directory: $dir" -ForegroundColor Green
        } else {
            Write-Host "$dir directory not empty, files remaining:" -ForegroundColor Yellow
            foreach ($file in $remainingFiles) {
                Write-Host "  - $($file.FullName)" -ForegroundColor Yellow
            }
            
            # For entities directory, offer to move files to game/entities
            if ($dir -eq "entities") {
                $files = Get-ChildItem -Path "$srcPath\$dir" -Filter "*.ts"
                foreach ($file in $files) {
                    $entityName = $file.BaseName
                    $destDir = "$srcPath\game\entities\$entityName"
                    $destFile = "$destDir\$($file.Name)"
                    
                    if (!(Test-Path $destDir)) {
                        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                    }
                    
                    if (!(Test-Path $destFile)) {
                        Copy-Item -Path $file.FullName -Destination $destFile -Force
                        Write-Host "Moved entity $($file.Name) to $destFile" -ForegroundColor Green
                        Remove-Item -Path $file.FullName -Force
                    } else {
                        Write-Host "Destination already exists for $($file.Name), manual review needed" -ForegroundColor Yellow
                    }
                }
            }
            
            # For renderers directory, offer to move files to game/renderers or entity folders
            if ($dir -eq "renderers") {
                $files = Get-ChildItem -Path "$srcPath\$dir" -Filter "*.ts"
                foreach ($file in $files) {
                    # If filename matches EntityNameRenderer.ts pattern, move to entity folder
                    if ($file.BaseName -match "(.+)Renderer") {
                        $entityName = $Matches[1]
                        $destDir = "$srcPath\game\entities\$entityName"
                        if (Test-Path "$srcPath\game\entities\$entityName") {
                            $destFile = "$destDir\$($file.Name)"
                            if (!(Test-Path $destFile)) {
                                Copy-Item -Path $file.FullName -Destination $destFile -Force
                                Write-Host "Moved renderer $($file.Name) to entity folder: $destFile" -ForegroundColor Green
                                Remove-Item -Path $file.FullName -Force
                            } else {
                                Write-Host "Destination already exists for $($file.Name), manual review needed" -ForegroundColor Yellow
                            }
                        } else {
                            # If no matching entity folder, move to game/renderers
                            $destFile = "$srcPath\game\renderers\$($file.Name)"
                            if (!(Test-Path $destFile)) {
                                Copy-Item -Path $file.FullName -Destination $destFile -Force
                                Write-Host "Moved renderer $($file.Name) to game/renderers: $destFile" -ForegroundColor Green
                                Remove-Item -Path $file.FullName -Force
                            } else {
                                Write-Host "Destination already exists for $($file.Name), manual review needed" -ForegroundColor Yellow
                            }
                        }
                    } else {
                        # For general renderers, move to game/renderers
                        $destFile = "$srcPath\game\renderers\$($file.Name)"
                        if (!(Test-Path $destFile)) {
                            Copy-Item -Path $file.FullName -Destination $destFile -Force
                            Write-Host "Moved renderer $($file.Name) to game/renderers: $destFile" -ForegroundColor Green
                            Remove-Item -Path $file.FullName -Force
                        } else {
                            Write-Host "Destination already exists for $($file.Name), manual review needed" -ForegroundColor Yellow
                        }
                    }
                }
            }
            
            # For other directories like systems, utils, etc.
            if ($dir -in @("systems", "utils", "ui", "net")) {
                $destDir = "$srcPath\game\$dir"
                $files = Get-ChildItem -Path "$srcPath\$dir" -Filter "*.ts"
                foreach ($file in $files) {
                    $destFile = "$destDir\$($file.Name)"
                    if (!(Test-Path $destFile)) {
                        Copy-Item -Path $file.FullName -Destination $destFile -Force
                        Write-Host "Moved $dir file $($file.Name) to game/$($dir): $destFile" -ForegroundColor Green
                        Remove-Item -Path $file.FullName -Force
                    } else {
                        Write-Host "Destination already exists for $($file.Name), manual review needed" -ForegroundColor Yellow
                    }
                }
            }
            
            # For core directory, move files to engine/core
            if ($dir -eq "core") {
                $destDir = "$srcPath\engine\core"
                $files = Get-ChildItem -Path "$srcPath\$dir" -Filter "*.ts"
                foreach ($file in $files) {
                    $destFile = "$destDir\$($file.Name)"
                    if (!(Test-Path $destFile)) {
                        Copy-Item -Path $file.FullName -Destination $destFile -Force
                        Write-Host "Moved core file $($file.Name) to engine/core: $destFile" -ForegroundColor Green
                        Remove-Item -Path $file.FullName -Force
                    } else {
                        Write-Host "Destination already exists for $($file.Name), manual review needed" -ForegroundColor Yellow
                    }
                }
            }
        }
    }
}

Write-Host "Cleanup complete!" -ForegroundColor Cyan
