import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import https from 'https';
import http from 'http';
import { shell, app, clipboard } from 'electron';

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

export interface DesktopApp {
  name: string;
  path: string;
  source: 'desktop' | 'public-desktop' | 'start-menu';
}

export interface InstalledApp {
  name: string;
  appId: string;
}

export class SystemService {
  private pythonHelperPath: string;
  private cachedApps: InstalledApp[] = [];
  private cachedDesktopApps: DesktopApp[] = [];
  private lastAppScanTime: number = 0;
  private lastDesktopScanTime: number = 0;

  constructor() {
    this.pythonHelperPath = path.join(__dirname, '..', 'python', 'system_helper.py');
    // If running in packaged app or build, check alternate location
    if (!fs.existsSync(this.pythonHelperPath)) {
      this.pythonHelperPath = path.join(process.cwd(), 'electron', 'python', 'system_helper.py');
    }

    // Pre-cache desktop apps and installed apps on startup
    this.getDesktopApps().catch(() => { });
    this.getInstalledApps().catch(() => { });
  }

  /**
   * Scan and get all applications directly from the User's Desktop and Public Desktop
   */
  async getDesktopApps(forceRefresh = false): Promise<DesktopApp[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedDesktopApps.length > 0 && now - this.lastDesktopScanTime < 60000) {
      return this.cachedDesktopApps;
    }

    const apps: DesktopApp[] = [];
    const desktopDirs = [
      { dir: path.join(os.homedir(), 'Desktop'), source: 'desktop' as const },
      { dir: 'C:\\Users\\Public\\Desktop', source: 'public-desktop' as const },
    ];

    for (const { dir, source } of desktopDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const ext = path.extname(file.name).toLowerCase();
          if (ext === '.lnk' || ext === '.exe' || ext === '.url') {
            const base = path.basename(file.name, ext).trim();
            // Ignore system or non-app clutter
            if (base && !base.startsWith('desktop.ini') && !base.startsWith('.')) {
              apps.push({
                name: base,
                path: path.join(dir, file.name),
                source,
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`Error reading desktop folder ${dir}:`, err.message);
      }
    }

    // Also scan Start Menu Programs folder for any shortcuts not on desktop
    const startMenuDirs = [
      path.join(process.env.APPDATA || '', 'Microsoft\\Windows\\Start Menu\\Programs'),
      'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
    ];

    const scanDirRecursive = (dirPath: string, depth = 0) => {
      if (depth > 3 || !fs.existsSync(dirPath)) return;
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            scanDirRecursive(full, depth + 1);
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.lnk' || ext === '.exe') {
              const base = path.basename(entry.name, ext).trim();
              if (base && !apps.some((a) => a.name.toLowerCase() === base.toLowerCase())) {
                apps.push({
                  name: base,
                  path: full,
                  source: 'start-menu',
                });
              }
            }
          }
        }
      } catch { }
    };

    for (const smDir of startMenuDirs) {
      scanDirRecursive(smDir, 0);
    }

    this.cachedDesktopApps = apps;
    this.lastDesktopScanTime = now;
    return apps;
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
   * Open ANY application installed on Desktop or Windows laptop
   */
  async openApp(appName: string): Promise<{ success: boolean; message: string; matchedApp?: string; path?: string }> {
    let clean = appName.toLowerCase().trim();

    // Clean common prefixes and suffixes
    clean = clean
      .replace(/^(open|launch|start|kholo|chalu karo|chalao|kripya|please)\s+/, '')
      .replace(/\s+(kholo|open karo|chalao|chalu karo|app|application|program|software)$/, '')
      .replace(/^(desktop par|desktop pe|laptop par|laptop me|computer me|pc me|mera|mere)\s+/, '')
      .replace(/\s+(desktop par|desktop pe|laptop par|pc par)$/, '')
      .trim();

    if (!clean) {
      return { success: false, message: 'Please specify an application name to open.' };
    }

    // Direct Web URL Check
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      await shell.openExternal(appName);
      return { success: true, message: `Opened URL: ${appName}` };
    }

    // 1. YouTube specific handler ONLY if user explicitly wants to play video
    if (clean.includes('youtube')) {
      const ytQuery = clean.replace(/^(youtube\s*(pe|par|me|in)?|play\s*on\s*youtube)/i, '').trim();
      if (ytQuery) {
        return await this.playYouTubeVideo(ytQuery);
      }
    }

    // ========================================================
    // PRIORITY 1: SEARCH USER'S DESKTOP SHORTCUTS & APPS FIRST
    // ========================================================
    const desktopApps = await this.getDesktopApps();

    // Mapping for common aliases
    const aliases: { [key: string]: string[] } = {
      'vlc': ['vlc media player', 'vlc'],
      'vlc player': ['vlc media player', 'vlc'],
      'whatsapp': ['whatsapp', 'wa'],
      'brave': ['brave'],
      'brave browser': ['brave'],
      'vscode': ['visual studio code', 'vscode', 'code'],
      'code': ['visual studio code', 'vscode'],
      'visual studio code': ['visual studio code'],
      'telegram': ['teligram', 'telegram'],
      'teligram': ['teligram', 'telegram'],
      'chatgpt': ['chatgpt', 'chat gpt'],
      'chat gpt': ['chatgpt', 'chat gpt'],
      'gemini': ['google gemini', 'gemini'],
      'google gemini': ['google gemini', 'gemini'],
      'claude': ['claude'],
      'opencode': ['opencode'],
      'ghidra': ['ghidra'],
      'antigravity': ['antigravity ide', 'antigravity'],
      'antigravity ide': ['antigravity ide', 'antigravity'],
      'chrome': ['google chrome', 'chrome', 'google'],
      'google chrome': ['google chrome', 'chrome', 'google'],
      'google': ['google', 'google chrome', 'chrome'],
      'facebook': ['facebook', 'fb'],
      'instagram': ['instagram', 'insta'],
      'jiosphere': ['jiosphere'],
      'excalidraw': ['excalidraw'],
      'chathub': ['chathub'],
      'x': ['x', 'twitter'],
      'twitter': ['x', 'twitter'],
      'youtube': ['youtube'],
      'yt': ['youtube'],
    };

    let matchedDesktop: DesktopApp | undefined;

    // Check aliases
    const aliasTargets = aliases[clean];
    if (aliasTargets) {
      for (const target of aliasTargets) {
        matchedDesktop = desktopApps.find(
          (a) => a.name.toLowerCase() === target || a.name.toLowerCase().includes(target)
        );
        if (matchedDesktop) break;
      }
    }

    // Check exact name match on Desktop
    if (!matchedDesktop) {
      matchedDesktop = desktopApps.find((a) => a.name.toLowerCase() === clean);
    }

    // Check startsWith match on Desktop
    if (!matchedDesktop) {
      matchedDesktop = desktopApps.find((a) => a.name.toLowerCase().startsWith(clean));
    }

    // Check includes match on Desktop
    if (!matchedDesktop) {
      matchedDesktop = desktopApps.find(
        (a) => a.name.toLowerCase().includes(clean) || clean.includes(a.name.toLowerCase())
      );
    }

    // If an app is found on Desktop, launch it directly!
    if (matchedDesktop) {
      try {
        const filePath = matchedDesktop.path;

        // 1. Try native electron shell.openPath (Standard Windows double-click action)
        const openErr = await shell.openPath(filePath);
        if (!openErr) {
          const locName = matchedDesktop.source === 'desktop' ? 'Desktop' : 'Desktop/Start Menu';
          return {
            success: true,
            message: `${locName} se '${matchedDesktop.name}' open kar diya hai, sir!`,
            matchedApp: matchedDesktop.name,
            path: filePath,
          };
        }

        // 2. PowerShell Start-Process fallback
        await execAsync(`powershell -NoProfile -Command "Start-Process '${filePath.replace(/'/g, "''")}'"`);
        return {
          success: true,
          message: `Desktop se '${matchedDesktop.name}' open kar diya hai, sir!`,
          matchedApp: matchedDesktop.name,
          path: filePath,
        };
      } catch (err: any) {
        // Fallback to cmd start
        try {
          await execAsync(`cmd /c start "" "${matchedDesktop.path}"`);
          return {
            success: true,
            message: `Desktop se '${matchedDesktop.name}' open kar diya hai, sir!`,
            matchedApp: matchedDesktop.name,
            path: matchedDesktop.path,
          };
        } catch (innerErr: any) {
          return { success: false, message: `Failed to open ${matchedDesktop.name}: ${err.message}` };
        }
      }
    }

    // ========================================================
    // PRIORITY 2: STANDARD WINDOWS BUILT-IN SYSTEM TOOLS
    // ========================================================
    if (clean === 'notepad' || clean === 'note') {
      await execAsync('start notepad.exe');
      return { success: true, message: 'Notepad opened', matchedApp: 'Notepad' };
    }
    if (clean === 'calculator' || clean === 'calc') {
      await execAsync('start calc.exe');
      return { success: true, message: 'Calculator opened', matchedApp: 'Calculator' };
    }
    if (clean === 'explorer' || clean === 'file explorer' || clean === 'my computer' || clean === 'files') {
      await execAsync('start explorer.exe');
      return { success: true, message: 'File Explorer opened', matchedApp: 'File Explorer' };
    }
    if (clean === 'settings' || clean === 'windows settings') {
      await execAsync('start ms-settings:');
      return { success: true, message: 'Windows Settings opened', matchedApp: 'Settings' };
    }
    if (clean === 'cmd' || clean === 'terminal' || clean === 'powershell') {
      await execAsync('start powershell.exe');
      return { success: true, message: 'PowerShell terminal opened', matchedApp: 'PowerShell' };
    }
    if (clean === 'paint' || clean === 'mspaint') {
      await execAsync('start mspaint.exe');
      return { success: true, message: 'Paint opened', matchedApp: 'Paint' };
    }
    if (clean === 'task manager' || clean === 'taskmgr') {
      await execAsync('start taskmgr.exe');
      return { success: true, message: 'Task Manager opened', matchedApp: 'Task Manager' };
    }

    // ========================================================
    // PRIORITY 3: WINDOWS INSTALLED APPS (UWP / Get-StartApps)
    // ========================================================
    const apps = await this.getInstalledApps();
    let match = apps.find((a) => a.name.toLowerCase() === clean);
    if (!match) match = apps.find((a) => a.name.toLowerCase().startsWith(clean));
    if (!match) match = apps.find((a) => a.name.toLowerCase().includes(clean));

    if (match) {
      try {
        const appId = match.appId;
        // If direct executable path
        if (appId.includes('\\') && (appId.endsWith('.exe') || fs.existsSync(appId))) {
          await execAsync(`start "" "${appId}"`);
          return { success: true, message: `'${match.name}' open kar diya hai, sir!`, matchedApp: match.name };
        }
        // If UWP or Shell AppID
        if (!appId.startsWith('http://') && !appId.startsWith('https://')) {
          await execAsync(`powershell -NoProfile -Command "Start-Process 'explorer.exe' -ArgumentList 'shell:AppsFolder\\${appId}'"`);
          return { success: true, message: `'${match.name}' open kar diya hai, sir!`, matchedApp: match.name };
        }
      } catch (err: any) {
        console.warn('App launch error:', err.message);
      }
    }

    // ========================================================
    // PRIORITY 4: DO NOT SEARCH CHROME! RETURN ACCURATE STATUS
    // ========================================================
    return {
      success: false,
      message: `Aapke Desktop par '${appName}' application nahi mili. Kripya check karein ki Desktop par iska shortcut available hai ya nahi.`,
    };
  }

  /**
   * Run focus_and_type.ps1 safely to focus window and send keyboard actions
   */
  private async runFocusAndType(appTitle: string, action = 'paste_enter'): Promise<void> {
    const candidates = [
      path.join(app.getAppPath(), 'electron', 'scripts', 'focus_and_type.ps1'),
      path.join(process.cwd(), 'electron', 'scripts', 'focus_and_type.ps1'),
      path.join(__dirname, '..', 'scripts', 'focus_and_type.ps1'),
      path.join(__dirname, 'scripts', 'focus_and_type.ps1'),
    ];
    const targetScript = candidates.find((p) => fs.existsSync(p));
    if (!targetScript) return;

    return new Promise((resolve) => {
      const ps = spawn('powershell', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        targetScript,
        '-AppTitle',
        appTitle,
        '-Action',
        action,
      ]);
      ps.on('close', () => resolve());
      ps.on('error', () => resolve());
    });
  }

  /**
   * Open Desktop application from Desktop shortcut and automatically type/search question into it
   */
  async openDesktopAppAndSearch(appName: string, queryOrQuestion: string): Promise<{ success: boolean; message: string; appName: string }> {
    const cleanApp = appName.toLowerCase().trim();
    const query = queryOrQuestion.trim();

    // 1. Web Browsers (Chrome, Brave, JioSphere, Google)
    const isChrome = cleanApp === 'chrome' || cleanApp === 'google chrome' || cleanApp === 'google';
    const isBrave = cleanApp === 'brave' || cleanApp === 'brave browser';
    const isJioSphere = cleanApp === 'jiosphere';

    if (isChrome || isBrave || isJioSphere) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      try {
        if (isChrome) {
          await execAsync(`start chrome "${searchUrl}"`);
        } else if (isBrave) {
          await execAsync(`start brave "${searchUrl}"`);
        } else if (isJioSphere) {
          await execAsync(`start jiosphere "${searchUrl}"`);
        }
        return {
          success: true,
          message: `${isBrave ? 'Brave' : 'Google Chrome'} open karke "${query}" search kar diya hai, sir!`,
          appName: isBrave ? 'Brave' : 'Google Chrome',
        };
      } catch {
        await shell.openExternal(searchUrl);
        return {
          success: true,
          message: `Browser open karke "${query}" search kar diya hai, sir!`,
          appName: 'Google Chrome',
        };
      }
    }

    // 2. YouTube
    if (cleanApp.includes('youtube')) {
      const ytRes = await this.playYouTubeVideo(query);
      return {
        success: ytRes.success,
        message: ytRes.message,
        appName: 'YouTube',
      };
    }

    // 3. ChatGPT
    if (cleanApp.includes('chatgpt') || cleanApp.includes('chat gpt')) {
      try {
        clipboard.writeText(query);
      } catch (e: any) {
        console.warn('Clipboard write error:', e.message);
      }

      const gptUrl = `https://chatgpt.com/?q=${encodeURIComponent(query)}`;
      const desktopApps = await this.getDesktopApps();
      const matched = desktopApps.find((a) => /chatgpt/i.test(a.name));
      if (matched) {
        try {
          await shell.openPath(matched.path);
        } catch {
          await shell.openExternal(gptUrl);
        }
      } else {
        await shell.openExternal(gptUrl);
      }

      this.runFocusAndType('ChatGPT', 'paste_enter').catch(() => {});

      return {
        success: true,
        message: `ChatGPT open karke "${query}" submit kar diya hai, sir!`,
        appName: 'ChatGPT',
      };
    }

    // 4. Google Gemini
    if (cleanApp.includes('gemini')) {
      try {
        clipboard.writeText(query);
      } catch (e: any) {
        console.warn('Clipboard write error:', e.message);
      }

      const desktopApps = await this.getDesktopApps();
      const matched = desktopApps.find((a) => /gemini/i.test(a.name));
      if (matched) {
        try {
          await shell.openPath(matched.path);
        } catch {
          await shell.openExternal('https://gemini.google.com/app');
        }
      } else {
        await shell.openExternal('https://gemini.google.com/app');
      }

      this.runFocusAndType('Gemini', 'paste_enter').catch(() => {});

      return {
        success: true,
        message: `Google Gemini open karke "${query}" search kar diya hai, sir!`,
        appName: 'Google Gemini',
      };
    }

    // 5. Claude
    if (cleanApp.includes('claude')) {
      try {
        clipboard.writeText(query);
      } catch (e: any) {
        console.warn('Clipboard write error:', e.message);
      }

      const desktopApps = await this.getDesktopApps();
      const matched = desktopApps.find((a) => /claude/i.test(a.name));
      if (matched) {
        try {
          await shell.openPath(matched.path);
        } catch {
          await shell.openExternal('https://claude.ai');
        }
      } else {
        await shell.openExternal('https://claude.ai');
      }

      this.runFocusAndType('Claude', 'paste_enter').catch(() => {});

      return {
        success: true,
        message: `Claude open karke "${query}" submit kar diya hai, sir!`,
        appName: 'Claude',
      };
    }

    // 6. Generic Desktop App
    const desktopApps = await this.getDesktopApps();
    let matched = desktopApps.find((a) => a.name.toLowerCase() === cleanApp || a.name.toLowerCase().includes(cleanApp));
    if (!matched) {
      return {
        success: false,
        message: `Aapke Desktop par '${appName}' application nahi mili. Kripya check karein ki shortcut available hai.`,
        appName,
      };
    }

    try {
      clipboard.writeText(query);
    } catch (e: any) {
      console.warn('Clipboard write error:', e.message);
    }

    try {
      await shell.openPath(matched.path);
    } catch {
      await execAsync(`powershell -NoProfile -Command "Start-Process '${matched.path.replace(/'/g, "''")}'"`);
    }

    this.runFocusAndType(matched.name, 'paste_enter').catch(() => {});

    return {
      success: true,
      message: `Desktop se '${matched.name}' open karke "${query}" submit kar diya hai, sir!`,
      appName: matched.name,
    };
  }

  /**
   * Search and directly play a video or song on YouTube
   */
  async playYouTubeVideo(query: string): Promise<{ success: boolean; message: string; url: string; videoId?: string }> {
    let cleanQuery = query.trim();
    if (!cleanQuery || /^(song|play|gaana|video|music)$/i.test(cleanQuery)) {
      cleanQuery = 'trending songs 2026';
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
          await execAsync(`start "" "${playUrl}"`);
        } catch {
          await shell.openExternal(playUrl);
        }
        return {
          success: true,
          message: `यूट्यूब पर "${cleanQuery}" सर्च करके वीडियो प्ले कर दिया है, सर!`,
          url: playUrl,
          videoId,
        };
      }

      // If videoId wasn't found quickly, open the direct search results on YouTube
      try {
        await execAsync(`start "" "${searchUrl}"`);
      } catch {
        await shell.openExternal(searchUrl);
      }
      return {
        success: true,
        message: `यूट्यूब पर "${cleanQuery}" सर्च करके वीडियो ओपन कर दिया है, सर!`,
        url: searchUrl,
      };
    } catch (err: any) {
      const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
      await shell.openExternal(fallbackUrl);
      return {
        success: true,
        message: `यूट्यूब पर "${cleanQuery}" सर्च कर दिया है, सर!`,
        url: fallbackUrl,
      };
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

