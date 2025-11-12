# PowerShell script to push to GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Push to GitHub Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get repository URL
Write-Host "Enter your GitHub repository URL:" -ForegroundColor Yellow
Write-Host "Example: https://github.com/username/repo.git" -ForegroundColor Gray
$repoUrl = Read-Host "Repository URL"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "Error: Repository URL is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Adding remote origin..." -ForegroundColor Green
git remote add origin $repoUrl

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Staging Files" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Stage all files
git add .

Write-Host ""
Write-Host "Files staged:" -ForegroundColor Green
git status --short

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Committing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

git commit -m "Add essential files, setup scripts, and fix missing client/public files"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing to GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Try to push
Write-Host "Attempting to push to main branch..." -ForegroundColor Yellow
git branch -M main
git push -u origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Push failed. This might be because:" -ForegroundColor Yellow
    Write-Host "1. Remote already has commits" -ForegroundColor Gray
    Write-Host "2. Authentication required" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Try force push? (This will overwrite remote)" -ForegroundColor Yellow
    $confirm = Read-Host "Force push? (y/n)"
    
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        Write-Host "Force pushing..." -ForegroundColor Yellow
        git push -f origin main
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your code is now on GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tell your friend to:" -ForegroundColor Cyan
    Write-Host "1. git clone $repoUrl" -ForegroundColor White
    Write-Host "2. cd into the directory" -ForegroundColor White
    Write-Host "3. npm run init" -ForegroundColor White
    Write-Host "4. npm run seed" -ForegroundColor White
    Write-Host "5. npm start" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Push failed. Please check:" -ForegroundColor Red
    Write-Host "1. Repository URL is correct" -ForegroundColor Gray
    Write-Host "2. You have push access" -ForegroundColor Gray
    Write-Host "3. GitHub authentication is set up" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can try manually:" -ForegroundColor Yellow
    Write-Host "git push origin main" -ForegroundColor White
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
