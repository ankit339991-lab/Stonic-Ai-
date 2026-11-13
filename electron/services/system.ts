import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { shell, app } from 'electron';

const execAsync = promisify(exec);

export interface SystemMetrics {
  cpuUsage: number;
  totalMemoryGB: number;
  freeMemoryGB: number;
  usedMemoryGB: number;
  memoryUsagePercent: number;
  platform: string;
  uptimeHours: number;
  hostname: string;
}

export interface BatteryStatus {
  success: boolean;
  percent: number;
  charging: boolean;
  status: string;
  error?: string;
}

export interface DriveStorage {
  drive: string;
  total_gb: number;
  free_gb: number;
  used_gb: number;
  percent_used: number;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string;
}

export class SystemService {
  private pythonHelperPath: string;

  constructor() {
    this.pythonHelperPath = path.join(__dirname, '..', 'python', 'system_helper.py');
    // If running in packaged app or build, check alternate location
    if (!fs.existsSync(this.pythonHelperPath)) {
      this.pythonHelperPath = path.join(process.cwd(), 'electron', 'python', 'system_helper.py');
    }
  }

  /**
   * Run python helper script safely with json output
   */
  private async runPythonHelper(args: string[]): Promise<any> {
    return new Promise((resolve) => {
      const pythonProcess = spawn('python', [this.pythonHelperPath, ...args]);
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          try {
            resolve(JSON.parse(stdout.trim()));
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse python output', raw: stdout });
          }
        } else {
          resolve({ success: false, error: stderr || `Python exited with code ${code}` });
        }
      });

      pythonProcess.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Open allowlisted applications and URLs
   */
  async openApp(appName: string): Promise<{ success: boolean; message: string }> {
    const lower = appName.toLowerCase().trim();

    try {
      if (lower.includes('chrome')) {
        await execAsync('start chrome');
        return { success: true, message: 'Google Chrome opened' };
      }
      if (lower.includes('youtube')) {
        await shell.openExternal('https://www.youtube.com');
        return { success: true, message: 'YouTube opened in browser' };
      }
      if (lower.includes('whatsapp')) {
        // Try Windows Store URI scheme first, fallback to browser
        try {
          await execAsync('start whatsapp:');
          return { success: true, message: 'WhatsApp Desktop launched' };
        } catch {
          await shell.openExternal('https://web.whatsapp.com');
          return { success: true, message: 'WhatsApp Web opened in browser' };
        }
      }
      if (lower.includes('notepad')) {
        await execAsync('start notepad.exe');
        return { success: true, message: 'Notepad opened' };
      }
      if (lower.includes('calculator') || lower.includes('calc')) {
        await execAsync('start calc.exe');
        return { success: true, message: 'Calculator opened' };
      }
      if (lower.includes('explorer') || lower.includes('file manager') || lower.includes('files')) {
        await execAsync('start explorer.exe');
        return { success: true, message: 'File Explorer opened' };
      }
      if (lower.includes('settings')) {
        await execAsync('start ms-settings:');
        return { success: true, message: 'Windows Settings opened' };
      }
      if (lower.includes('terminal') || lower.includes('powershell')) {
        await execAsync('start powershell.exe');
        return { success: true, message: 'PowerShell terminal opened' };
      }

      // Check if it's a URL
      if (lower.startsWith('http://') || lower.startsWith('https://')) {
        await shell.openExternal(appName);
        return { success: true, message: `Opened URL: ${appName}` };
      }

      return { success: false, message: `Application '${appName}' is not in the allowlist.` };
    } catch (error: any) {
      return { success: false, message: `Error opening ${appName}: ${error.message}` };
    }
  }

  /**
   * Adjust volume (up, down, mute)
   */
  async adjustVolume(action: 'up' | 'down' | 'mute' | 'unmute', amount: number = 6): Promise<{ success: boolean; message: string }> {
    const res = await this.runPythonHelper(['volume', action, amount.toString()]);
    if (res.success) {
      return { success: true, message: `Volume command '${action}' executed successfully.` };
    }

    // PowerShell fallback
    try {
      if (action === 'mute' || action === 'unmute') {
        await execAsync('powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"');
      } else if (action === 'up') {
        const count = Math.ceil(amount / 2);
        await execAsync(`powershell -c "$w = New-Object -ComObject WScript.Shell; for ($i=0; $i -lt ${count}; $i++) { $w.SendKeys([char]175) }"`);
      } else if (action === 'down') {
        const count = Math.ceil(amount / 2);
        await execAsync(`powershell -c "$w = New-Object -ComObject WScript.Shell; for ($i=0; $i -lt ${count}; $i++) { $w.SendKeys([char]174) }"`);
      }
      return { success: true, message: `Volume ${action} adjusted via PowerShell fallback.` };
    } catch (err: any) {
      return { success: false, message: `Volume adjustment failed: ${err.message}` };
    }
  }

  /**
   * Lock Windows Workstation
   */
  async lockLaptop(): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync('rundll32.exe user32.dll,LockWorkStation');
      return { success: true, message: 'Laptop workstation locked successfully.' };
    } catch (err: any) {
      return { success: false, message: `Failed to lock laptop: ${err.message}` };
    }
  }

  /**
   * Capture screenshot and return path and base64 preview
   */
  async takeScreenshot(): Promise<{ success: boolean; path?: string; dataUrl?: string; error?: string }> {
    try {
      const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `stonic_screenshot_${timestamp}.png`;
      const filePath = path.join(screenshotsDir, filename);

      const res = await this.runPythonHelper(['screenshot', filePath]);
      if (res.success && fs.existsSync(filePath)) {
        const imageBuffer = fs.readFileSync(filePath);
        const dataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        return { success: true, path: filePath, dataUrl };
      }

      // PowerShell native fallback
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
        $bitmap.Save('${filePath.replace(/\\/g, '\\\\')}')
        $graphics.Dispose()
        $bitmap.Dispose()
      `;
      await execAsync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`);

      if (fs.existsSync(filePath)) {
        const imageBuffer = fs.readFileSync(filePath);
        const dataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        return { success: true, path: filePath, dataUrl };
      }

      return { success: false, error: 'Screenshot file was not created' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get Battery Status
   */
  async getBatteryStatus(): Promise<BatteryStatus> {
    const pyRes = await this.runPythonHelper(['battery']);
    if (pyRes.success) {
      return pyRes;
    }

    // PowerShell fallback
    try {
      const { stdout } = await execAsync('powershell -Command "Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json"');
      if (stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const percent = parsed.EstimatedChargeRemaining || 100;
        const charging = parsed.BatteryStatus === 2 || parsed.BatteryStatus === 6;
        return {
          success: true,
          percent,
          charging,
          status: charging ? 'Charging' : 'On Battery'
        };
      }
    } catch {
      // Desktop PC without battery
    }

    return {
      success: true,
      percent: 100,
      charging: true,
      status: 'AC Connected (Desktop/Plugged in)'
    };
  }

  /**
   * Get Storage Drive Information
   */
  async getStorageInfo(): Promise<DriveStorage[]> {
    const pyRes = await this.runPythonHelper(['storage']);
    if (pyRes.success && pyRes.drives) {
      return pyRes.drives;
    }

    // PowerShell fallback
    try {
      const psCommand = `powershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N='FreeGB';E={[math]::Round($_.Free/1GB,1)}}, @{N='UsedGB';E={[math]::Round($_.Used/1GB,1)}} | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCommand);
      if (stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        return items.map((d: any) => {
          const total = (d.FreeGB || 0) + (d.UsedGB || 0);
          return {
            drive: `${d.Name}:\\`,
            total_gb: Math.round(total * 10) / 10,
            free_gb: d.FreeGB || 0,
            used_gb: d.UsedGB || 0,
            percent_used: total > 0 ? Math.round(((d.UsedGB || 0) / total) * 100) : 0
          };
        });
      }
    } catch {
      // fallback
    }

    return [];
  }

  /**
   * Get CPU, Memory, and Platform Metrics
   */
  getSystemMetrics(): SystemMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();

    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });
    const idlePercent = totalTick > 0 ? (totalIdle / totalTick) : 0;
    const cpuUsage = Math.round((1 - idlePercent) * 100);

    return {
      cpuUsage: Math.max(5, Math.min(cpuUsage, 95)),
      totalMemoryGB: Math.round((totalMem / (1024 ** 3)) * 10) / 10,
      freeMemoryGB: Math.round((freeMem / (1024 ** 3)) * 10) / 10,
      usedMemoryGB: Math.round((usedMem / (1024 ** 3)) * 10) / 10,
      memoryUsagePercent: Math.round((usedMem / totalMem) * 100),
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      uptimeHours: Math.round((os.uptime() / 3600) * 10) / 10,
      hostname: os.hostname(),
    };
  }

  /**
   * Search files in common directories (Desktop, Documents, Downloads)
   */
  async searchFiles(query: string, searchDir?: string, limit: number = 20): Promise<FileItem[]> {
    const rootDir = searchDir || app.getPath('documents');
    const results: FileItem[] = [];
    const lowerQuery = query.toLowerCase();

    const scan = (dir: string, depth: number) => {
      if (depth > 4 || results.length >= limit) return;
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          if (file.name.startsWith('.') || file.name === 'node_modules' || file.name === '$RECYCLE.BIN') continue;
          const fullPath = path.join(dir, file.name);

          if (file.name.toLowerCase().includes(lowerQuery)) {
            try {
              const stat = fs.statSync(fullPath);
              results.push({
                name: file.name,
                path: fullPath,
                isDirectory: file.isDirectory(),
                sizeBytes: stat.size,
                modifiedAt: stat.mtime.toISOString(),
              });
            } catch {
              // ignore file read error
            }
          }

          if (file.isDirectory() && results.length < limit) {
            scan(fullPath, depth + 1);
          }
        }
      } catch {
        // ignore permission errors
      }
    };

    scan(rootDir, 0);

    // If documents yielded few results, also scan desktop
    if (results.length < limit && !searchDir) {
      scan(app.getPath('desktop'), 0);
    }

    return results;
  }

  /**
   * Create folder with validation
   */
  async createFolder(targetPath: string): Promise<{ success: boolean; message: string; path?: string }> {
    try {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
        return { success: true, message: `Folder created at ${targetPath}`, path: targetPath };
      }
      return { success: false, message: `Folder already exists at ${targetPath}` };
    } catch (err: any) {
      return { success: false, message: `Failed to create folder: ${err.message}` };
    }
  }

  /**
   * Rename file or folder
   */
  async renameFile(oldPath: string, newPath: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!fs.existsSync(oldPath)) {
        return { success: false, message: `Source file does not exist: ${oldPath}` };
      }
      if (fs.existsSync(newPath)) {
        return { success: false, message: `Destination already exists: ${newPath}` };
      }
      fs.renameSync(oldPath, newPath);
      return { success: true, message: `Renamed to ${path.basename(newPath)}` };
    } catch (err: any) {
      return { success: false, message: `Failed to rename: ${err.message}` };
    }
  }

  /**
   * Copy or move file
   */
  async copyOrMoveFile(srcPath: string, destPath: string, mode: 'copy' | 'move'): Promise<{ success: boolean; message: string }> {
    try {
      if (!fs.existsSync(srcPath)) {
        return { success: false, message: `Source does not exist: ${srcPath}` };
      }
      if (mode === 'copy') {
        fs.copyFileSync(srcPath, destPath);
        return { success: true, message: `File copied to ${destPath}` };
      } else {
        fs.renameSync(srcPath, destPath);
        return { success: true, message: `File moved to ${destPath}` };
      }
    } catch (err: any) {
      return { success: false, message: `Operation failed: ${err.message}` };
    }
  }

  /**
   * Open document using default Windows application
   */
  async openDocument(filePath: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: `File does not exist: ${filePath}` };
      }
      const errorMsg = await shell.openPath(filePath);
      if (errorMsg) {
        return { success: false, message: errorMsg };
      }
      return { success: true, message: `Opened: ${path.basename(filePath)}` };
    } catch (err: any) {
      return { success: false, message: `Error opening document: ${err.message}` };
    }
  }
}
