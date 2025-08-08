# PowerShell script to start the client app
Write-Host "Starting client application..." -ForegroundColor Cyan

# Change to client directory
Set-Location -Path .\client

# Create a refresh token to force data reload
$refreshToken = @{
    timestamp = (Get-Date).ToString("o")
    forceRefresh = $true
}

# Create public directory if it doesn't exist
if (-not (Test-Path -Path .\public)) {
    New-Item -Path .\public -ItemType Directory
}

# Write token to file
$refreshToken | ConvertTo-Json | Out-File -FilePath .\public\refresh_token.json -Encoding utf8

Write-Host "Created refresh token to force data reload" -ForegroundColor Green

# Start the development server
Write-Host "Starting npm development server..." -ForegroundColor Cyan
npm run start 