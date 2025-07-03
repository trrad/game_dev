# PowerShell script to update import paths for engine/game refactoring
# This script replaces import paths in the codebase to match the new directory structure

Write-Host "Starting import path updates for engine/game refactoring..."
$rootPath = "c:\Users\tradc\game_dev\evo_td\src"
$fileCount = 0
$updateCount = 0

# Define the path mappings (old -> new)
$pathMappings = @(
    # Core engine components
    @{ Old = '../core/Component'; New = '../engine/core/Component' },
    @{ Old = '../core/GameObject'; New = '../engine/core/GameObject' },
    @{ Old = '../core/EventStack'; New = '../engine/core/EventStack' },
    @{ Old = '../core/TimeManager'; New = '../engine/core/TimeManager' },
    @{ Old = '../utils/Logger'; New = '../engine/utils/Logger' },
    @{ Old = '../utils/MathUtils'; New = '../engine/utils/MathUtils' },
    @{ Old = '../utils/GeometryUtils'; New = '../engine/utils/GeometryUtils' },
    @{ Old = '../utils/ObjectTracker'; New = '../engine/utils/ObjectTracker' },
    
    # Scene components
    @{ Old = '../scene/SceneManager'; New = '../engine/scene/SceneManager' },
    @{ Old = '../scene/SceneNodeComponent'; New = '../engine/components/NodeComponent' },
    @{ Old = '../scene/SceneGraphEventSystem'; New = '../engine/scene/SceneGraphEventSystem' },
    
    # Components moved to engine
    @{ Old = '../components/PositionComponent'; New = '../engine/components/PositionComponent' },
    @{ Old = '../components/MovementComponent'; New = '../engine/components/MovementComponent' },
    @{ Old = '../components/HealthComponent'; New = '../engine/components/HealthComponent' },
    @{ Old = '../components/RadiusComponent'; New = '../engine/components/RadiusComponent' },
    @{ Old = '../components/AIBehaviorComponent'; New = '../engine/components/AIBehaviorComponent' },
    
    # Game-specific components moved to engine
    @{ Old = '../game/components/PositionComponent'; New = '../engine/components/PositionComponent' },
    @{ Old = '../game/components/MovementComponent'; New = '../engine/components/MovementComponent' },
    @{ Old = '../game/components/HealthComponent'; New = '../engine/components/HealthComponent' },
    
    # Fix SceneNodeComponent -> NodeComponent
    @{ Old = 'SceneNodeComponent'; New = 'NodeComponent' }
)

# Get all TypeScript files
$tsFiles = Get-ChildItem -Path $rootPath -Filter "*.ts" -Recurse

foreach ($file in $tsFiles) {
    $fileContent = Get-Content -Path $file.FullName -Raw
    $originalContent = $fileContent
    $fileUpdated = $false
    
    # Apply each mapping
    foreach ($mapping in $pathMappings) {
        # Skip SceneNodeComponent name replacement for import statements (we handle those separately)
        if ($mapping.Old -eq "SceneNodeComponent" -and $mapping.New -eq "NodeComponent") {
            # Only replace SceneNodeComponent as a class reference, not in imports
            $importPattern = "import \{.*SceneNodeComponent.*\} from"
            $classPattern = "SceneNodeComponent"
            
            # Find all matches of import statements containing SceneNodeComponent
            $importMatches = [regex]::Matches($fileContent, $importPattern)
            
            # Only replace SceneNodeComponent outside of import statements
            if ($importMatches.Count -gt 0) {
                foreach ($match in $importMatches) {
                    $importStatement = $match.Value
                    # Replace in import statement separately (path + name)
                    $updatedImport = $importStatement -replace "SceneNodeComponent", "NodeComponent"
                    $fileContent = $fileContent.Replace($importStatement, $updatedImport)
                }
                
                # Now replace all other occurrences of SceneNodeComponent
                $nonImportContent = $fileContent
                foreach ($match in $importMatches) {
                    $importStatement = $match.Value
                    # Temporarily replace import statements to not affect them
                    $nonImportContent = $nonImportContent.Replace($importStatement, "PRESERVED_IMPORT_STATEMENT")
                }
                
                # Replace SceneNodeComponent in non-import statements
                $nonImportContent = $nonImportContent -replace $classPattern, $mapping.New
                
                # Restore import statements
                foreach ($match in $importMatches) {
                    $importStatement = $match.Value
                    $updatedImport = $importStatement -replace "SceneNodeComponent", "NodeComponent"
                    $nonImportContent = $nonImportContent.Replace("PRESERVED_IMPORT_STATEMENT", $updatedImport)
                }
                
                $fileContent = $nonImportContent
            }
            else {
                # No import statements, just replace all occurrences
                $fileContent = $fileContent -replace $classPattern, $mapping.New
            }
        }
        else {
            # For path replacements
            $oldPath = $mapping.Old
            $newPath = $mapping.New
            
            # Use regex pattern that ensures we're only matching import paths
            $pattern = "from\s+['""](.*)$oldPath['""]"
            $replacement = "from `$1$newPath`""
            
            $fileContent = $fileContent -replace $pattern, $replacement
        }
    }
    
    # Check if the file was actually modified
    if ($fileContent -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $fileContent -NoNewline
        $fileUpdated = $true
        $updateCount++
        Write-Host "Updated: $($file.FullName)"
    }
    
    $fileCount++
}

Write-Host "Import path update completed."
Write-Host "Processed $fileCount files."
Write-Host "Updated $updateCount files."
