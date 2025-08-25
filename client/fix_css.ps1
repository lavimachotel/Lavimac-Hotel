$content = Get-Content ".\src\index.css"
$newContent = @(
    "@tailwind base;"
    "@tailwind components;"
    "@tailwind utilities;"
    ""
    "@import '@fortawesome/fontawesome-free/css/all.min.css';"
)

for ($i = 4; $i -lt $content.Length; $i++) {
    if ($content[$i] -notmatch "^:root \{ '@fortawesome") {
        $newContent += $content[$i]
    }
}

$newContent | Set-Content ".\src\index.css.new"
Move-Item -Path ".\src\index.css.new" -Destination ".\src\index.css" -Force

Write-Host "index.css file has been fixed." 