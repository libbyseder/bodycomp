$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $root 'public'
$svg = Join-Path $publicDir 'icon.svg'
$toolsDir = Join-Path $PSScriptRoot '.tools\resvg'
$resvgZip = Join-Path $toolsDir 'resvg-win64.zip'
$resvgExe = Join-Path $toolsDir 'resvg.exe'
$resvgUrl = 'https://github.com/linebender/resvg/releases/download/v0.47.0/resvg-win64.zip'

if (-not (Test-Path $svg)) {
  throw "Missing SVG source: $svg"
}

function Export-PngWithDrawing([int]$Size, [string]$OutputName) {
  $out = Join-Path $publicDir $OutputName
  [IconRenderer]::Render($Size, $out)
  Write-Host "Wrote $out (System.Drawing)"
}

function Export-PngWithResvg([int]$Size, [string]$OutputName) {
  $out = Join-Path $publicDir $OutputName
  & $resvgExe $svg -w $Size -h $Size -o $out
  if ($LASTEXITCODE -ne 0) {
    throw "resvg failed for $OutputName (exit $LASTEXITCODE)"
  }
  Write-Host "Wrote $out (resvg)"
}

if (-not ([System.Management.Automation.PSTypeName]'IconRenderer').Type) {
  Add-Type @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class IconRenderer
{
    static void AddRoundedRect(GraphicsPath path, RectangleF rect, float radius)
    {
        float d = radius * 2f;
        path.AddArc(rect.X, rect.Y, d, d, 180f, 90f);
        path.AddArc(rect.Right - d, rect.Y, d, d, 270f, 90f);
        path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0f, 90f);
        path.AddArc(rect.X, rect.Bottom - d, d, d, 90f, 90f);
        path.CloseFigure();
    }

    public static void Render(int size, string outputPath)
    {
        using (var bitmap = new Bitmap(size, size))
        using (var graphics = Graphics.FromImage(bitmap))
        {
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.Clear(Color.Transparent);

            float scale = size / 512f;
            graphics.ScaleTransform(scale, scale);

            using (var backgroundPath = new GraphicsPath())
            {
                AddRoundedRect(backgroundPath, new RectangleF(0f, 0f, 512f, 512f), 112f);
                using (var brush = new SolidBrush(Color.FromArgb(255, 9, 9, 11)))
                {
                    graphics.FillPath(brush, backgroundPath);
                }
            }

            using (var borderPath = new GraphicsPath())
            {
                AddRoundedRect(borderPath, new RectangleF(36f, 36f, 440f, 440f), 96f);
                using (var pen = new Pen(Color.FromArgb(56, 34, 211, 238), 8f))
                {
                    pen.LineJoin = LineJoin.Round;
                    graphics.DrawPath(pen, borderPath);
                }
            }

            var teal = Color.FromArgb(34, 211, 238);
            using (var thickPen = new Pen(teal, 34f))
            {
                thickPen.StartCap = LineCap.Round;
                thickPen.EndCap = LineCap.Round;
                thickPen.LineJoin = LineJoin.Round;

                graphics.DrawLine(thickPen, 104f, 88f, 104f, 424f);

                using (var letterPath = new GraphicsPath())
                {
                    letterPath.StartFigure();
                    letterPath.AddLine(104f, 88f, 224f, 88f);
                    letterPath.AddBezier(224f, 88f, 292f, 88f, 332f, 124f, 332f, 172f);
                    letterPath.AddBezier(332f, 172f, 332f, 216f, 300f, 248f, 256f, 256f);
                    letterPath.AddBezier(256f, 256f, 316f, 264f, 356f, 300f, 356f, 356f);
                    letterPath.AddBezier(356f, 356f, 356f, 424f, 304f, 472f, 224f, 472f);
                    letterPath.AddLine(224f, 472f, 104f, 472f);
                    graphics.DrawPath(thickPen, letterPath);
                }

                graphics.DrawLine(thickPen, 272f, 296f, 392f, 176f);
                graphics.DrawLine(thickPen, 392f, 176f, 332f, 176f);
                graphics.DrawLine(thickPen, 392f, 176f, 392f, 248f);
            }

            using (var trendPen = new Pen(teal, 26f))
            {
                trendPen.StartCap = LineCap.Round;
                trendPen.EndCap = LineCap.Round;
                trendPen.LineJoin = LineJoin.Round;
                graphics.DrawLine(trendPen, 216f, 344f, 292f, 268f);
                graphics.DrawLine(trendPen, 292f, 268f, 364f, 300f);
            }

            bitmap.Save(outputPath, ImageFormat.Png);
        }
    }
}
'@ -ReferencedAssemblies System.Drawing
}

$useResvg = $false
if (-not (Test-Path $resvgExe)) {
  try {
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    Invoke-WebRequest -Uri $resvgUrl -OutFile $resvgZip
    Expand-Archive -Path $resvgZip -DestinationPath $toolsDir -Force
  }
  catch {
    Write-Warning "Could not download resvg: $($_.Exception.Message)"
  }
}

if (Test-Path $resvgExe) {
  $testOut = Join-Path $env:TEMP "bodytrend-icon-test.png"
  try {
    & $resvgExe $svg -w 32 -h 32 -o $testOut 2>$null
    if ($LASTEXITCODE -eq 0 -and (Test-Path $testOut)) {
      $useResvg = $true
    }
  }
  catch {
    $useResvg = $false
  }
  finally {
    if (Test-Path $testOut) {
      Remove-Item $testOut -Force -ErrorAction SilentlyContinue
    }
  }
}

if ($useResvg) {
  Export-PngWithResvg 192 'icon-192.png'
  Export-PngWithResvg 512 'icon-512.png'
  Export-PngWithResvg 180 'apple-touch-icon.png'
}
else {
  Write-Warning 'resvg unavailable; using System.Drawing fallback renderer.'
  Export-PngWithDrawing 192 'icon-192.png'
  Export-PngWithDrawing 512 'icon-512.png'
  Export-PngWithDrawing 180 'apple-touch-icon.png'
}