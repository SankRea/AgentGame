param(
  [string]$SpriteDirectory = "src/assets/sprites"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Resize-PixelArt {
  param(
    [string]$InputPath,
    [string]$OutputPath,
    [int]$Width,
    [int]$Height
  )

  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $InputPath))
  $output = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $graphics.DrawImage($source, 0, 0, $Width, $Height)
  $output.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $output.Dispose()
  $source.Dispose()
}

Resize-PixelArt `
  -InputPath "$SpriteDirectory/characters.png" `
  -OutputPath "$SpriteDirectory/characters-sheet.png" `
  -Width 1024 `
  -Height 1024

Resize-PixelArt `
  -InputPath "$SpriteDirectory/environment.png" `
  -OutputPath "$SpriteDirectory/environment-sheet.png" `
  -Width 1024 `
  -Height 1024

# 将生成稿规格化为 4x4 后，抽取 Tiled 当前使用的前五个 tile。
$terrainAssetPath = (Get-Item -LiteralPath "$SpriteDirectory/terrain-source.png").FullName
# Normalize the generated terrain source and extract the five Tiled tiles.
$terrainAssetPath = (Get-Item -LiteralPath "$SpriteDirectory/terrain-source.png").FullName
$terrainSource = [System.Drawing.Image]::FromFile($terrainAssetPath)
$normalized = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$normalizedGraphics = [System.Drawing.Graphics]::FromImage($normalized)
$normalizedGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$normalizedGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$normalizedGraphics.DrawImage($terrainSource, 0, 0, 1024, 1024)

$tileset = New-Object System.Drawing.Bitmap(160, 32, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$tilesetGraphics = [System.Drawing.Graphics]::FromImage($tileset)
$tilesetGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$tilesetGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$sourceFrames = @(
  [System.Drawing.Rectangle]::new(0, 0, 256, 256),
  [System.Drawing.Rectangle]::new(256, 0, 256, 256),
  [System.Drawing.Rectangle]::new(512, 0, 256, 256),
  [System.Drawing.Rectangle]::new(768, 0, 256, 256),
  [System.Drawing.Rectangle]::new(0, 256, 256, 256)
)

for ($index = 0; $index -lt $sourceFrames.Count; $index += 1) {
  $destination = [System.Drawing.Rectangle]::new($index * 32, 0, 32, 32)
  $tilesetGraphics.DrawImage(
    $normalized,
    $destination,
    $sourceFrames[$index],
    [System.Drawing.GraphicsUnit]::Pixel
  )
}

$tileset.Save("$SpriteDirectory/terrain-tiles.png", [System.Drawing.Imaging.ImageFormat]::Png)
$tilesetGraphics.Dispose()
$tileset.Dispose()
$normalizedGraphics.Dispose()
$normalized.Dispose()
$terrainSource.Dispose()

Write-Output "Created characters-sheet.png (1024x1024, 4x4)"
Write-Output "Created environment-sheet.png (1024x1024, 4x4)"
Write-Output "Created terrain-tiles.png (160x32, 5 tiles)"
