# 7Cards Games v1.3 - Copy the release into the existing GitHub repository and push.
# Prerequisites: Git for Windows installed, GitHub sign-in via Git Credential Manager.
# Run from the extracted v1.3 release folder in PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\Update-GitHub-v1.3.ps1
param(
  [string]$RepoUrl = 'https://github.com/syamsai268-cmyk/7cards-games-by-syam.git',
  [string]$Branch = 'main'
)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {throw 'Git is not installed or not in PATH. Restart PowerShell and retry.'}
if (-not (& git config --global user.name)) { throw 'Configure Git author name first: git config --global user.name "Syam"' }
if (-not (& git config --global user.email)) { throw 'Configure Git author email first: git config --global user.email "your-github-email"' }
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $env:TEMP ('7cards-update-' + [guid]::NewGuid().ToString('N').Substring(0,8))
Write-Host ('Cloning ' + $RepoUrl) -ForegroundColor Cyan
& git clone --branch $Branch $RepoUrl $target
if ($LASTEXITCODE -ne 0) {throw 'Git clone failed. Check internet and GitHub authentication.'}
$files = @('index.html','app.js','styles.css','sw.js','manifest.webmanifest','favicon.svg','icon-192.png','icon-512.png','render.yaml','README.md','DEPLOY-ON-RENDER.md','VERSION.txt')
foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $source $file) -Destination (Join-Path $target $file) -Force
}
New-Item -ItemType Directory -Force -Path (Join-Path $target '.github\workflows'),(Join-Path $target 'scripts') | Out-Null
Copy-Item -LiteralPath (Join-Path $source '.github\workflows\ci.yml') -Destination (Join-Path $target '.github\workflows\ci.yml') -Force
Copy-Item -LiteralPath (Join-Path $source 'scripts\check-release.mjs') -Destination (Join-Path $target 'scripts\check-release.mjs') -Force
Push-Location $target
try {
  & git add -- index.html app.js styles.css sw.js manifest.webmanifest favicon.svg icon-192.png icon-512.png render.yaml README.md DEPLOY-ON-RENDER.md VERSION.txt .github/workflows/ci.yml scripts/check-release.mjs
  if ($LASTEXITCODE -ne 0) {throw 'Git add failed.'}
  & git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {Write-Host 'No changes to push. The v1.3 files are already in GitHub.' -ForegroundColor Yellow;exit 0}
  & git commit -m 'Release 7Cards Games v1.3: compact mobile table and easier touch controls'
  if ($LASTEXITCODE -ne 0) {throw 'Commit failed. Configure git user.name and user.email, then retry.'}
  & git push origin $Branch
  if ($LASTEXITCODE -ne 0) {throw 'Push failed. Verify GitHub login and branch permissions.'}
  Write-Host 'Version 1.3 pushed to GitHub. Render auto-deploy will now start.' -ForegroundColor Green
  Write-Host 'Game: https://sevencards-games-by-syam.onrender.com'
  Write-Host 'Render: https://dashboard.render.com/static/srv-dc254lnf3r2c73ebqns0'
} finally {Pop-Location}
