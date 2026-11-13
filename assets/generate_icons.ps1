Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(5, 8, 17)) # Dark JARVIS background

# Draw glowing outer ring
$penOuter = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(200, 0, 243, 255)), 6
$g.DrawEllipse($penOuter, 20, 20, 216, 216)

# Draw secondary cyan ring
$penMid = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(160, 0, 102, 255)), 4
$g.DrawEllipse($penMid, 45, 45, 166, 166)

# Draw arc segments
$penArc = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 0, 243, 255)), 5
for ($i = 0; $i -lt 8; $i++) {
    $angle = $i * 45
    $g.DrawArc($penArc, 65, 65, 126, 126, $angle + 5, 35)
}

# Draw inner glowing core
$brushCore = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 0, 243, 255))
$g.FillEllipse($brushCore, 100, 100, 56, 56)

$brushWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$g.FillEllipse($brushWhite, 114, 114, 28, 28)

# Save PNG
$bmp.Save("assets/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Convert to ICO
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fileStream = New-Object System.IO.FileStream "assets/icon.ico", ([System.IO.FileMode]::Create)
$icon.Save($fileStream)
$fileStream.Close()

$g.Dispose()
$bmp.Dispose()
Write-Output "Icons generated successfully in assets/"
