$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$svg = Join-Path $root 'public\icon.svg'
$toolsDir = Join-Path $PSScriptRoot '.tools\resvg'
$resvgZip = Join-Path $toolsDir 'resvg-win64.zip'
$resvgExe = Join-Path $toolsDir 'resvg.exe'
$resvgUrl = 'https://github.com/linebender/resvg/releases/download/v0.47.0/resvg-win64.zip'

if (-not (Test-Path $svg)) {
  throw "Missing SVG source: $svg"
}

if (-not (Test-Path $resvgExe)) {
  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  Invoke-WebRequest -Uri $resvgUrl -OutFile $resvgZip
  Expand-Archive -Path $resvgZip -DestinationPath $toolsDir -Force
}

function Export-Png([int]$Size, [string]$OutputName) {
  $out = Join-Path $root "public\$OutputName"
  & $resvgExe $svg -w $Size -h $Size -o $out
  if ($LASTEXITCODE -ne 0) {
    throw "resvg failed for $OutputName"
  }
  Write-Host "Wrote $out"
}

Export-Png 192 'icon-192.png'
Export-Png 512 'icon-512.png'
Export-Png 180 'apple-touch-icon.png'