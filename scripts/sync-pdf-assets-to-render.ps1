# Sync practice images to Render persistent disk (no Cloudflare needed).
#
# Prerequisites:
#   1. Upgrade Render web service to Starter ($7/mo) or higher
#   2. Add a 1 GB persistent disk mounted at: /opt/render/project/src/data
#   3. Enable SSH in Render dashboard and add your public key
#
# Usage (PowerShell, from project root):
#   $env:RENDER_SSH="your-service@ssh.frankfurt.render.com"   # from Render SSH tab
#   .\scripts\sync-pdf-assets-to-render.ps1
#
# Or one-liner with scp (Git Bash / WSL):
#   scp -r data/pdf-crops data/pdf-pages $RENDER_SSH:/opt/render/project/src/data/

param(
  [string]$RenderSsh = $env:RENDER_SSH
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$data = Join-Path $root "data"

if (-not $RenderSsh) {
  Write-Host @"

RENDER_SSH is not set.

1. Render Dashboard -> tigerparent service -> Connect -> SSH
2. Copy the SSH command (looks like: ssh USER@HOST)
3. Run:

   `$env:RENDER_SSH = "USER@HOST"
   .\scripts\sync-pdf-assets-to-render.ps1

"@
  exit 1
}

foreach ($dir in @("pdf-crops", "pdf-pages")) {
  $local = Join-Path $data $dir
  if (-not (Test-Path $local)) {
    Write-Warning "Missing $local — skip"
    continue
  }
  Write-Host "Uploading $dir ..."
  scp -r $local "${RenderSsh}:/opt/render/project/src/data/"
}

Write-Host @"

Done. Test on production (no PDF_ASSETS_PUBLIC_BASE_URL needed with Render disk):
  https://tigerparent.study/api/pdf-assets/pdf-crops/.../problem-006.png

"@
