# PowerShell script to start the client with fresh token
# This script creates a refresh token file and starts the client

# Create refresh token directory if it doesn't exist
$refreshTokenDir = "./public"
if (-not (Test-Path $refreshTokenDir)) {
    New-Item -ItemType Directory -Path $refreshTokenDir
    Write-Host "Created directory: $refreshTokenDir"
}

# Create a refresh token file
$refreshTokenPath = "./public/refresh_token.json"
$currentTime = Get-Date
$forceRefresh = $true  # Set to true to force clearing local storage on next start

# Create the refresh token JSON
$refreshToken = @{
    created = $currentTime.ToString("o")
    forceRefresh = $forceRefresh
} | ConvertTo-Json

# Write the refresh token to the file
Set-Content -Path $refreshTokenPath -Value $refreshToken
Write-Host "Created refresh token at: $refreshTokenPath"

# Display the content of the refresh token
Write-Host "Refresh token content:"
Get-Content $refreshTokenPath

# Start the client
Write-Host "Starting client application..."
npm run start 