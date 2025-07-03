# PowerShell script to clean up the project after refactoring
$rootPath = "c:\Users\tradc\game_dev\evo_td"
$srcPath = "$rootPath\src"

Write-Host "=== Project Cleanup Script ===" -ForegroundColor Cyan
Write-Host "Cleaning up generated files and empty directories after refactoring..." -ForegroundColor Yellow

# Step 1: Remove all generated .js files from src directory
Write-Host "`n1. Removing generated .js files from src directory..." -ForegroundColor Green

$jsFiles = Get-ChildItem -Path $srcPath -Recurse -Filter "*.js" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*vite.config*" # Keep vite config files
}

$jsFilesCount = $jsFiles.Count
Write-Host "Found $jsFilesCount .js files to remove"

foreach ($jsFile in $jsFiles) {
    $relativePath = $jsFile.FullName.Substring($srcPath.Length + 1)
    try {
        Remove-Item $jsFile.FullName -Force
        Write-Host "Removed: $relativePath" -ForegroundColor DarkGreen
    }
    catch {
        Write-Host "Error removing $relativePath : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 2: Remove .js.map files
Write-Host "`n2. Removing .js.map files..." -ForegroundColor Green

$mapFiles = Get-ChildItem -Path $srcPath -Recurse -Filter "*.js.map" | Where-Object { 
    $_.FullName -notlike "*node_modules*"
}

$mapFilesCount = $mapFiles.Count
Write-Host "Found $mapFilesCount .js.map files to remove"

foreach ($mapFile in $mapFiles) {
    $relativePath = $mapFile.FullName.Substring($srcPath.Length + 1)
    try {
        Remove-Item $mapFile.FullName -Force
        Write-Host "Removed: $relativePath" -ForegroundColor DarkGreen
    }
    catch {
        Write-Host "Error removing $relativePath : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 3: Remove empty directories left from refactoring
Write-Host "`n3. Removing empty directories..." -ForegroundColor Green

$emptyDirs = @()

# Check specific directories we know might be empty
$dirsToCheck = @(
    "$srcPath\core",
    "$srcPath\utils"
)

foreach ($dir in $dirsToCheck) {
    if (Test-Path $dir) {
        $items = Get-ChildItem -Path $dir -Force
        if ($items.Count -eq 0) {
            $emptyDirs += $dir
        }
        elseif ($items.Count -eq 1 -and $items[0].Name -eq "log_output") {
            # Special case: utils directory with only log_output
            $logOutputItems = Get-ChildItem -Path "$dir\log_output" -Force
            if ($logOutputItems.Count -eq 0 -or ($logOutputItems | Where-Object { $_.Name -notin @(".gitignore", "README.md") }).Count -eq 0) {
                Write-Host "Utils directory only contains log_output with git files, keeping it"
            }
        }
    }
}

foreach ($emptyDir in $emptyDirs) {
    $relativePath = $emptyDir.Substring($rootPath.Length + 1)
    try {
        Remove-Item $emptyDir -Recurse -Force
        Write-Host "Removed empty directory: $relativePath" -ForegroundColor DarkGreen
    }
    catch {
        Write-Host "Error removing directory $relativePath : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 4: Update tsconfig.json to use build directory
Write-Host "`n4. Updating tsconfig.json to use separate build directory..." -ForegroundColor Green

$tsconfigPath = "$rootPath\tsconfig.json"
if (Test-Path $tsconfigPath) {
    try {
        $tsconfigContent = Get-Content $tsconfigPath -Raw
        
        # Add outDir to compilerOptions
        $updatedContent = $tsconfigContent -replace '("skipLibCheck": true)( // skip type-checking.*)?', '$1$2,
    "outDir": "dist" // output compiled JS files to dist directory'
        
        Set-Content -Path $tsconfigPath -Value $updatedContent -NoNewline
        Write-Host "Updated tsconfig.json to output to 'dist' directory" -ForegroundColor DarkGreen
    }
    catch {
        Write-Host "Error updating tsconfig.json: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 5: Create .gitignore entry for dist directory
Write-Host "`n5. Updating .gitignore for dist directory..." -ForegroundColor Green

$gitignorePath = "$rootPath\.gitignore"
if (Test-Path $gitignorePath) {
    $gitignoreContent = Get-Content $gitignorePath -Raw
    if ($gitignoreContent -notlike "*dist/*") {
        $updatedGitignore = $gitignoreContent + "`n# Build output`ndist/`n"
        Set-Content -Path $gitignorePath -Value $updatedGitignore -NoNewline
        Write-Host "Added dist/ to .gitignore" -ForegroundColor DarkGreen
    }
    else {
        Write-Host "dist/ already in .gitignore" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor White
Write-Host "- Removed $jsFilesCount .js files" -ForegroundColor Green
Write-Host "- Removed $mapFilesCount .js.map files" -ForegroundColor Green
Write-Host "- Removed $($emptyDirs.Count) empty directories" -ForegroundColor Green
Write-Host "- Updated tsconfig.json to use dist/ directory" -ForegroundColor Green
Write-Host "- Updated .gitignore for build output" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "- Run 'npm run build' to test the new build configuration" -ForegroundColor White
Write-Host "- The compiled files will now be in the 'dist' directory" -ForegroundColor White
