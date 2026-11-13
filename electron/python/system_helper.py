"""
STONIC AI - Windows System Automation Helper
A safe, robust Python bridge for Windows hardware, power, volume, and desktop controls.
"""
import sys
import json
import os
import subprocess
import platform
import ctypes
from ctypes import wintypes

def get_battery_status():
    """Returns battery percentage and AC charging status using Windows SYSTEM_POWER_STATUS."""
    class SYSTEM_POWER_STATUS(ctypes.Structure):
        _fields_ = [
            ('ACLineStatus', wintypes.BYTE),
            ('BatteryFlag', wintypes.BYTE),
            ('BatteryLifePercent', wintypes.BYTE),
            ('SystemStatusFlag', wintypes.BYTE),
            ('BatteryLifeTime', wintypes.DWORD),
            ('BatteryFullLifeTime', wintypes.DWORD),
        ]

    status = SYSTEM_POWER_STATUS()
    if ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(status)):
        percent = status.BatteryLifePercent
        is_charging = status.ACLineStatus == 1
        return {
            "success": True,
            "percent": percent if percent <= 100 else 100,
            "charging": is_charging,
            "status": "Charging" if is_charging else "On Battery"
        }
    return {"success": False, "error": "Could not read battery status"}

def get_storage_info():
    """Gets all available drive partitions and free/total storage."""
    drives = []
    bitmask = ctypes.windll.kernel32.GetLogicalDrives()
    for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        if bitmask & 1:
            drive_path = f"{letter}:\\"
            try:
                free_bytes = ctypes.c_ulonglong(0)
                total_bytes = ctypes.c_ulonglong(0)
                total_free = ctypes.c_ulonglong(0)
                ret = ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                    drive_path,
                    ctypes.byref(free_bytes),
                    ctypes.byref(total_bytes),
                    ctypes.byref(total_free)
                )
                if ret != 0:
                    total_gb = round(total_bytes.value / (1024 ** 3), 1)
                    free_gb = round(free_bytes.value / (1024 ** 3), 1)
                    used_gb = round(total_gb - free_gb, 1)
                    percent_used = round((used_gb / total_gb) * 100, 1) if total_gb > 0 else 0
                    drives.append({
                        "drive": drive_path,
                        "total_gb": total_gb,
                        "free_gb": free_gb,
                        "used_gb": used_gb,
                        "percent_used": percent_used
                    })
            except Exception:
                pass
        bitmask >>= 1
    return {"success": True, "drives": drives}

def lock_workstation():
    """Safely locks the Windows laptop."""
    try:
        ctypes.windll.user32.LockWorkStation()
        return {"success": True, "message": "Workstation locked"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def take_screenshot(output_path):
    """Takes a full screen screenshot via PowerShell System.Drawing."""
    ps_script = f"""
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
    $bitmap.Save('{output_path}')
    $graphics.Dispose()
    $bitmap.Dispose()
    """
    try:
        subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], check=True, capture_output=True)
        if os.path.exists(output_path):
            return {"success": True, "path": output_path}
        return {"success": False, "error": "File was not generated"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def adjust_volume(action, amount=5):
    """
    Adjust volume: 'up', 'down', 'mute', 'unmute'.
    Uses virtual key strokes for VK_VOLUME_MUTE (0xAD), VK_VOLUME_DOWN (0xAE), VK_VOLUME_UP (0xAF).
    """
    VK_VOLUME_MUTE = 0xAD
    VK_VOLUME_DOWN = 0xAE
    VK_VOLUME_UP = 0xAF

    try:
        if action == "up":
            steps = max(1, int(amount) // 2)
            for _ in range(steps):
                ctypes.windll.user32.keybd_event(VK_VOLUME_UP, 0, 0, 0)
                ctypes.windll.user32.keybd_event(VK_VOLUME_UP, 0, 2, 0)
            return {"success": True, "action": "volume_up", "steps": steps}
        elif action == "down":
            steps = max(1, int(amount) // 2)
            for _ in range(steps):
                ctypes.windll.user32.keybd_event(VK_VOLUME_DOWN, 0, 0, 0)
                ctypes.windll.user32.keybd_event(VK_VOLUME_DOWN, 0, 2, 0)
            return {"success": True, "action": "volume_down", "steps": steps}
        elif action in ["mute", "unmute", "toggle_mute"]:
            ctypes.windll.user32.keybd_event(VK_VOLUME_MUTE, 0, 0, 0)
            ctypes.windll.user32.keybd_event(VK_VOLUME_MUTE, 0, 2, 0)
            return {"success": True, "action": "toggle_mute"}
        else:
            return {"success": False, "error": f"Unknown action: {action}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_system_overview():
    """Returns general Windows laptop overview."""
    battery = get_battery_status()
    storage = get_storage_info()
    return {
        "success": True,
        "os": f"{platform.system()} {platform.release()} ({platform.version()})",
        "machine": platform.machine(),
        "processor": platform.processor(),
        "battery": battery,
        "storage": storage.get("drives", [])
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No command provided"}))
        return

    command = sys.argv[1].lower()
    
    if command == "battery":
        res = get_battery_status()
    elif command == "storage":
        res = get_storage_info()
    elif command == "lock":
        res = lock_workstation()
    elif command == "screenshot":
        path = sys.argv[2] if len(sys.argv) > 2 else "screenshot.png"
        res = take_screenshot(path)
    elif command == "volume":
        action = sys.argv[2] if len(sys.argv) > 2 else "up"
        amount = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        res = adjust_volume(action, amount)
    elif command == "overview":
        res = get_system_overview()
    else:
        res = {"success": False, "error": f"Unknown command: {command}"}

    print(json.dumps(res))

if __name__ == "__main__":
    main()
