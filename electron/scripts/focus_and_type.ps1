param(
    [string]$AppTitle,
    [string]$Action = "paste_enter"
)

$w = New-Object -ComObject WScript.Shell
$activated = $false

# 1. Try AppActivate with provided title
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Milliseconds 200
    if ($w.AppActivate($AppTitle)) {
        $activated = $true
        break
    }
}

# 2. If not activated, search running processes by MainWindowTitle or ProcessName
if (-not $activated) {
    $clean = $AppTitle.ToLower().Trim()
    $p = Get-Process | Where-Object { 
        ($_.MainWindowTitle -and $_.MainWindowTitle.ToLower().Contains($clean)) -or 
        ($_.ProcessName -and $_.ProcessName.ToLower().Contains($clean))
    } | Select-Object -First 1

    if ($p) {
        [void]$w.AppActivate($p.Id)
        $activated = $true
    }
}

Start-Sleep -Milliseconds 500

# 3. Perform action
if ($Action -eq "omnibox") {
    # Focus browser address bar (Ctrl+L), paste clipboard and hit Enter
    $w.SendKeys('^l')
    Start-Sleep -Milliseconds 250
    $w.SendKeys('^v')
    Start-Sleep -Milliseconds 250
    $w.SendKeys('{ENTER}')
} elseif ($Action -eq "youtube") {
    # In YouTube, press '/' to focus search, paste and hit Enter
    $w.SendKeys('/')
    Start-Sleep -Milliseconds 300
    $w.SendKeys('^v')
    Start-Sleep -Milliseconds 300
    $w.SendKeys('{ENTER}')
} else {
    # Default: Paste into active prompt box and submit
    $w.SendKeys('^v')
    Start-Sleep -Milliseconds 300
    $w.SendKeys('{ENTER}')
}

Write-Output "SUCCESS: Action executed for $AppTitle"
