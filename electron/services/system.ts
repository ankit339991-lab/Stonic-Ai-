import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import https from 'https';
import http from 'http';
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

export interface InstalledApp {
  name: string;
  appId: string;
}

export class SystemService {
  private pythonHelperPath: string;
  private cachedApps: InstalledApp[] = [];
  private lastAppScanTime: number = 0;

  constructor() {
    this.pythonHelperPath = path.join(__dirname, '..', 'python', 'system_helper.py');
    // If running in packaged app or build, check alternate location
    if (!fs.existsSync(this.pythonHelperPath)) {
      this.pythonHelperPath = path.join(process.cwd(), 'electron', 'python', 'system_helper.py');
    }

    // Pre-cache installed apps in background on startup
    this.getInstalledApps().catch(() => {});
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
   * Get all installed applications on the Windows laptop dynamically
   */
  async getInstalledApps(forceRefresh = false): Promise<InstalledApp[]> {
    const now = Date.now();
    // Cache for 10 minutes unless forced
    if (!forceRefresh && this.cachedApps.length > 0 && now - this.lastAppScanTime < 600000) {
      return this.cachedApps;
    }

    try {
      const psCommand = `powershell -NoProfile -Command "Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress"`;
      const { stdout } = await execAsync(psCommand, { maxBuffer: 10 * 1024 * 1024 });

      if (stdout.trim()) {
        const parsed = JSON.parse(stdout.trim());
        const rawApps: any[] = Array.isArray(parsed) ? parsed : [parsed];

        // Built-in standard Windows applications fallback list
        const builtIns: InstalledApp[] = [
          { name: 'Google Chrome', appId: 'Chrome' },
          { name: 'Notepad', appId: 'notepad.exe' },
          { name: 'Calculator', appId: 'calc.exe' },
          { name: 'Command Prompt', appId: 'cmd.exe' },
          { name: 'PowerShell', appId: 'powershell.exe' },
          { name: 'File Explorer', appId: 'explorer.exe' },
          { name: 'Paint', appId: 'mspaint.exe' },
          { name: 'Task Manager', appId: 'taskmgr.exe' },
          { name: 'Windows Settings', appId: 'ms-settings:' },
          { name: 'Control Panel', appId: 'control.exe' },
          { name: 'Snipping Tool', appId: 'snippingtool.exe' },
        ];

        // Deduplicate by name
        const map = new Map<string, InstalledApp>();
        for (const app of builtIns) {
          map.set(app.name.toLowerCase(), app);
        }
        for (const app of rawApps) {
          if (app.Name && app.AppID) {
            map.set(app.Name.toLowerCase(), { name: app.Name, appId: app.AppID });
          }
        }

        this.cachedApps = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        this.lastAppScanTime = now;
        return this.cachedApps;
      }
    } catch (err: any) {
      console.warn('Could not query Get-StartApps:', err.message);
    }

    // Return builtins if scan failed
    return [
      { name: 'Google Chrome', appId: 'Chrome' },
      { name: 'Notepad', appId: 'notepad.exe' },
      { name: 'Calculator', appId: 'calc.exe' },
      { name: 'PowerShell', appId: 'powershell.exe' },
      { name: 'File Explorer', appId: 'explorer.exe' },
      { name: 'Windows Settings', appId: 'ms-settings:' },
    ];
  }

  /**
   * Open ANY application installed on the laptop dynamically
   */
  async openApp(appName: string): Promise<{ success: boolean; message: string; matchedApp?: string }> {
    let clean = appName.toLowerCase().trim();

    // Clean common prefixes and suffixes
    clean = clean
      .replace(/^(open|launch|start|kholo|chalu karo|chalao)\s+/, '')
      .replace(/\s+(kholo|open karo|chalao|chalu karo|app|application)$/, '')
      .trim();

    if (!clean) {
      return { success: false, message: 'Please specify an application name to open.' };
    }

    // Direct Web URL Check
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      await shell.openExternal(appName);
      return { success: true, message: `Opened URL: ${appName}` };
    }

    // 1. Check if user asked for YouTube song/video or search
    if (clean.includes('youtube')) {
      const ytQuery = clean.replace(/^(youtube\s*(pe|par|me|in)?|play\s*on\s*youtube)/i, '').trim();
      if (ytQuery) {
        return await this.playYouTubeVideo(ytQuery);
      }
      await shell.openExternal('https://www.youtube.com');
      return { success: true, message: 'YouTube opened in browser' };
    }

    // 2. Check if user asked for Google search
    if (clean.startsWith('google ') || clean.includes('google search')) {
      const gQuery = clean.replace(/^(google\s*search\s*|google\s*(pe|par|me)?\s*search\s*karo\s*|google\s*)/i, '').trim();
      if (gQuery) {
        return await this.searchGoogle(gQuery);
      }
      await execAsync('start chrome');
      return { success: true, message: 'Google Chrome opened' };
    }

    // 3. Quick hardwired mappings for common Windows essentials
    if (clean === 'chrome' || clean === 'google chrome') {
      try {
        await execAsync('start chrome');
        return { success: true, message: 'Google Chrome opened' };
      } catch {
        await shell.openExternal('https://www.google.com');
        return { success: true, message: 'Google opened' };
      }
    }

    if (clean === 'whatsapp' || clean === 'wa') {
      try {
        await execAsync('start whatsapp:');
        return { success: true, message: 'WhatsApp Desktop launched' };
      } catch {
        try {
          await execAsync(`powershell -NoProfile -Command "Start-Process 'explorer.exe' -ArgumentList 'shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App'"`);
          return { success: true, message: 'WhatsApp Desktop launched' };
        } catch {
          await shell.openExternal('https://web.whatsapp.com');
          return { success: true, message: 'WhatsApp Web opened in browser' };
        }
      }
    }

    if (clean === 'notepad' || clean === 'note') {
      await execAsync('start notepad.exe');
      return { success: true, message: 'Notepad opened' };
    }

    if (clean === 'calculator' || clean === 'calc') {
      await execAsync('start calc.exe');
      return { success: true, message: 'Calculator opened' };
    }

    if (clean === 'explorer' || clean === 'file explorer' || clean === 'my computer' || clean === 'files') {
      await execAsync('start explorer.exe');
      return { success: true, message: 'File Explorer opened' };
    }

    if (clean === 'settings' || clean === 'windows settings') {
      await execAsync('start ms-settings:');
      return { success: true, message: 'Windows Settings opened' };
    }

    if (clean === 'cmd' || clean === 'terminal' || clean === 'powershell') {
      await execAsync('start powershell.exe');
      return { success: true, message: 'PowerShell terminal opened' };
    }

    if (clean === 'paint' || clean === 'mspaint') {
      await execAsync('start mspaint.exe');
      return { success: true, message: 'Paint opened' };
    }

    if (clean === 'task manager' || clean === 'taskmgr') {
      await execAsync('start taskmgr.exe');
      return { success: true, message: 'Task Manager opened' };
    }

    // 4. Dynamic search across all installed apps on this laptop
    const apps = await this.getInstalledApps();

    // Priority 1: Exact name match
    let match = apps.find((a) => a.name.toLowerCase() === clean);

    // Priority 2: Starts with match (e.g. "cursor" -> "Cursor", "capcut" -> "CapCut", "brave" -> "Brave")
    if (!match) {
      match = apps.find((a) => a.name.toLowerCase().startsWith(clean));
    }

    // Priority 3: Substring / includes match (e.g. "vlc" -> "VLC media player", "word" -> "Microsoft Word")
    if (!match) {
      match = apps.find((a) => a.name.toLowerCase().includes(clean));
    }

    // Priority 4: Word match (e.g. "media player" or "code")
    if (!match) {
      const words = clean.split(/\s+/).filter(Boolean);
      match = apps.find((a) => {
        const lowerName = a.name.toLowerCase();
        return words.every((w) => lowerName.includes(w));
      });
    }

    // If an installed app was matched, launch it via its AppID
    if (match) {
      try {
        const appId = match.appId;

        // If AppID is a web URL
        if (appId.startsWith('http://') || appId.startsWith('https://')) {
          await shell.openExternal(appId);
          return { success: true, message: `Opened '${match.name}' in browser`, matchedApp: match.name };
        }

        // If AppID is a direct executable path
        if (appId.includes('\\') && (appId.endsWith('.exe') || fs.existsSync(appId))) {
          await execAsync(`start "" "${appId}"`);
          return { success: true, message: `Opened '${match.name}' successfully`, matchedApp: match.name };
        }

        // Launch UWP or Windows Shell AppID via explorer shell:AppsFolder
        await execAsync(`powershell -NoProfile -Command "Start-Process 'explorer.exe' -ArgumentList 'shell:AppsFolder\\${appId}'"`);
        return { success: true, message: `Opened '${match.name}' successfully`, matchedApp: match.name };
      } catch (err: any) {
        // Fallback to direct start
        try {
          await execAsync(`cmd /c start "" "${clean}"`);
          return { success: true, message: `Launched '${match.name}'`, matchedApp: match.name };
        } catch (innerErr: any) {
          return { success: false, message: `Failed to open ${match.name}: ${err.message}` };
        }
      }
    }

    // 5. General Fallback: Try launching via Windows cmd start
    try {
      await execAsync(`cmd /c start "" "${clean}"`);
      return { success: true, message: `Started '${clean}' via Windows system.` };
    } catch {
      return {
        success: false,
        message: `Application '${clean}' laptop par nahi mili. Aap installed apps list me check kar sakte hain.`,
      };
    }
  }

  /**
   * Search and directly play a video or song on YouTube
   */
  async playYouTubeVideo(query: string): Promise<{ success: boolean; message: string; url: string; videoId?: string }> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      await shell.openExternal('https://www.youtube.com');
      return { success: true, message: 'YouTube opened', url: 'https://www.youtube.com' };
    }

    try {
      // Fetch YouTube search page in background to get first video ID
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;

      const videoId = await new Promise<string | null>((resolve) => {
        const req = https.get(
          searchUrl,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 3500,
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => {
              body += chunk;
              // Check early if we already have a video match to avoid reading entire stream
              const earlyMatch = body.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
              if (earlyMatch) {
                req.destroy();
                resolve(earlyMatch[1]);
              }
            });
            res.on('end', () => {
              const m = body.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/) || body.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
              resolve(m ? m[1] : null);
            });
          }
        );

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
      });

      if (videoId) {
        const playUrl = `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
        try {
          await execAsync(`start chrome "${playUrl}"`);
        } catch {
          await shell.openExternal(playUrl);
        }
        return {
          success: true,
          message: `यूट्यूब पर "${cleanQuery}" प्ले किया जा रहा है!`,
          url: playUrl,
          videoId,
        };
      }

      // If videoId wasn't found quickly, open the direct search results on YouTube
      try {
        await execAsync(`start chrome "${searchUrl}"`);
      } catch {
        await shell.openExternal(searchUrl);
      }
      return {
        success: true,
        message: `यूट्यूब पर "${cleanQuery}" सर्च करके ओपन कर दिया है!`,
        url: searchUrl,
      };
    } catch (err: any) {
      const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
      await shell.openExternal(fallbackUrl);
      return { success: true, message: `YouTube opened: ${fallbackUrl}`, url: fallbackUrl };
    }
  }

  /**
   * Send WhatsApp message to contact or phone number
   */
  async sendWhatsAppMessage(recipientOrPhone: string, message: string): Promise<{ success: boolean; message: string }> {
    const cleanMsg = message.trim();
    const rawTarget = recipientOrPhone.trim();

    // Check if recipient has phone number digits
    const digitsOnly = rawTarget.replace(/\D/g, '');
    let formattedPhone = '';

    if (digitsOnly.length >= 10) {
      if (digitsOnly.length === 10) {
        formattedPhone = `91${digitsOnly}`; // Default Indian international code
      } else {
        formattedPhone = digitsOnly;
      }
    }

    try {
      if (formattedPhone) {
        // Direct WhatsApp Desktop Protocol with phone & text
        const deepLink = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(cleanMsg)}`;
        try {
          await shell.openExternal(deepLink);
          return {
            success: true,
            message: `व्हाट्सएप पर +${formattedPhone} के लिए चैट ओपन कर दी गई है और मैसेज लिख दिया गया है!`,
          };
        } catch {
          const webUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(cleanMsg)}`;
          await shell.openExternal(webUrl);
          return {
            success: true,
            message: `व्हाट्सएप वेब पर +${formattedPhone} के लिए मैसेज ओपन कर दिया गया है!`,
          };
        }
      } else {
        // Recipient is a contact name (e.g. "Papa", "Rahul", "Office")
        const deepLink = `whatsapp://send?text=${encodeURIComponent(cleanMsg)}`;
        try {
          await shell.openExternal(deepLink);
          return {
            success: true,
            message: `व्हाट्सएप ओपन हो गया है। "${rawTarget}" को भेजने के लिए मैसेज तैयार है: "${cleanMsg}"`,
          };
        } catch {
          const webUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(cleanMsg)}`;
          await shell.openExternal(webUrl);
          return {
            success: true,
            message: `व्हाट्सएप वेब ओपन हो गया है। "${rawTarget}" को मैसेज भेजने के लिए तैयार है।`,
          };
        }
      }
    } catch (err: any) {
      return { success: false, message: `व्हाट्सएप खोलने में त्रुटि: ${err.message}` };
    }
  }

  /**
   * Open Google Chrome and directly search for user's query
   */
  async searchGoogle(query: string): Promise<{ success: boolean; message: string; url: string }> {
    const cleanQuery = query.trim();
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;

    try {
      await execAsync(`start chrome "${searchUrl}"`);
      return {
        success: true,
        message: `गूगल क्रोम में "${cleanQuery}" सर्च किया गया है!`,
        url: searchUrl,
      };
    } catch {
      await shell.openExternal(searchUrl);
      return {
        success: true,
        message: `ब्राउज़र में गूगल सर्च "${cleanQuery}" ओपन कर दिया गया है!`,
        url: searchUrl,
      };
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

