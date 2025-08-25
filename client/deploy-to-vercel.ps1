# PowerShell script to deploy to Vercel

Write-Host "🚀 Preparing to deploy to Vercel..." -ForegroundColor Cyan

# Step 1: Make sure vercel CLI is installed
try {
    vercel --version | Out-Null
    Write-Host "Vercel CLI is already installed." -ForegroundColor Green
} catch {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Step 2: Navigate to client directory (if running from root)
if (!(Test-Path -Path "./package.json")) {
    Write-Host "Moving to client directory..." -ForegroundColor Yellow
    Set-Location -Path ./client
}

# Step 3: Build the project
Write-Host "📦 Building the project..." -ForegroundColor Cyan
npm run build

# Step 4: Deploy to Vercel
Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Cyan
vercel --prod

Write-Host "✅ Deployment process completed!" -ForegroundColor Green
Write-Host "If the deployment was successful, your site should be live now."
Write-Host "You can check your deployments at https://vercel.com/dashboard" 