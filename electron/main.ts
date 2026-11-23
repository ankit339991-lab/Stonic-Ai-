import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import { SystemService } from './services/system';
import { DatabaseService } from './services/database';
import { SettingsService } from './services/settings';
import { DocumentService } from './services/document';
import { BrowserService } from './services/browser';
import { VisibleBrowserService } from './services/visibleBrowser';
import { GeminiService } from './services/gemini';
import { AgentService } from './services/agent';

dotenv.config();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Instantiate core services
const settingsService = new SettingsService();
const systemService = new SystemService();
const databaseService = new DatabaseService();
const documentService = new DocumentService();
const browserService = new BrowserService();
const visibleBrowserService = new VisibleBrowserService();
const geminiService = new GeminiService(settingsService.getSettings().geminiApiKey);
const agentService = new AgentService(
  geminiService,
  systemService,
  browserService,
  documentService,
  databaseService
);

async function createWindow() {
  await databaseService.init();

  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1040,
    minHeight: 700,
    frame: false, // Frameless for futuristic JARVIS HUD Titlebar
    backgroundColor: '#030712',
    icon: appIcon,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-react', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Handle window close -> minimize to tray if enabled
  mainWindow.on('close', (event) => {
    if (!isQuitting && settingsService.getSettings().listenWhenMinimized) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTray(appIcon);
  registerGlobalShortcuts();
}

function createTray(icon?: Electron.NativeImage) {
  if (tray) return;

  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  const trayIcon = icon || (fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty());

  tray = new Tray(trayIcon);
  tray.setToolTip('STONIC AI - JARVIS Assistant');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open STONIC AI',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Emergency Stop All Tasks',
      click: () => {
        agentService.emergencyStop();
        mainWindow?.webContents.send('agent:emergency-stop');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit STONIC AI',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerGlobalShortcuts() {
  // Ctrl+Shift+Space to focus STONIC AI
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Ctrl+Shift+Escape for instant Emergency Stop
  globalShortcut.register('CommandOrControl+Shift+Escape', () => {
    agentService.emergencyStop();
    mainWindow?.webContents.send('agent:emergency-stop');
  });
}

// Forward Agent events to renderer
agentService.on('task-updated', (task) => {
  mainWindow?.webContents.send('agent:task-updated', task);
});

agentService.on('log', (log) => {
  mainWindow?.webContents.send('agent:log', log);
});

// Forward Visible Browser events to renderer
visibleBrowserService.on('status-update', (status) => {
  mainWindow?.webContents.send('visible-browser:status', status);
});

// Setup IPC Handlers
function setupIpc() {
  // Window controls
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => {
    if (settingsService.getSettings().listenWhenMinimized) {
      mainWindow?.hide();
    } else {
      isQuitting = true;
      mainWindow?.close();
    }
  });

  // System controls
  ipcMain.handle('system:getMetrics', () => systemService.getSystemMetrics());
  ipcMain.handle('system:getBattery', () => systemService.getBatteryStatus());
  ipcMain.handle('system:getStorage', () => systemService.getStorageInfo());
  ipcMain.handle('system:getDesktopApps', (_, force) => systemService.getDesktopApps(force));
  ipcMain.handle('system:getInstalledApps', (_, force) => systemService.getInstalledApps(force));
  ipcMain.handle('system:openApp', (_, appName: string) => systemService.openApp(appName));
  ipcMain.handle('system:openDesktopAppAndSearch', (_, appName: string, query: string) => systemService.openDesktopAppAndSearch(appName, query));
  ipcMain.handle('system:playYouTube', (_, query: string) => systemService.playYouTubeVideo(query));
  ipcMain.handle('system:sendWhatsApp', (_, target: string, message: string) => systemService.sendWhatsAppMessage(target, message));
  ipcMain.handle('system:searchGoogle', (_, query: string) => systemService.searchGoogle(query));
  ipcMain.handle('system:adjustVolume', (_, action, amount) => systemService.adjustVolume(action, amount));
  ipcMain.handle('system:takeScreenshot', () => systemService.takeScreenshot());
  ipcMain.handle('system:lockLaptop', () => systemService.lockLaptop());
  ipcMain.handle('system:searchFiles', (_, query, dir, limit) => systemService.searchFiles(query, dir, limit));
  ipcMain.handle('system:createFolder', (_, p) => systemService.createFolder(p));
  ipcMain.handle('system:renameFile', (_, o, n) => systemService.renameFile(o, n));
  ipcMain.handle('system:copyOrMoveFile', (_, s, d, m) => systemService.copyOrMoveFile(s, d, m));
  ipcMain.handle('system:openDocument', (_, p) => systemService.openDocument(p));

  // Browser automation (Headless)
  ipcMain.handle('browser:search', (_, query, limit) => browserService.search(query, limit));
  ipcMain.handle('browser:scrape', (_, url) => browserService.scrapeWebpage(url));

  // Visible Browser Automation System (Live Chrome + Persistent Profile)
  ipcMain.handle('visible-browser:getStatus', () => visibleBrowserService.getStatus());
  ipcMain.handle('visible-browser:setEnabled', (_, enabled) => visibleBrowserService.setEnabled(enabled));
  ipcMain.handle('visible-browser:stop', () => {
    visibleBrowserService.stopAutomation();
    return { success: true };
  });
  ipcMain.handle('visible-browser:open', (_, target) => visibleBrowserService.openWebsite(target));
  ipcMain.handle('visible-browser:askChatGPT', (_, question) => visibleBrowserService.askChatGPT(question));
  ipcMain.handle('visible-browser:askGemini', (_, question) => visibleBrowserService.askGemini(question));
  ipcMain.handle('visible-browser:searchGoogle', (_, query) => visibleBrowserService.searchGoogle(query));
  ipcMain.handle('visible-browser:playYouTube', (_, query) => visibleBrowserService.playYouTube(query));
  ipcMain.handle('visible-browser:controlYouTube', (_, action) => visibleBrowserService.controlYouTube(action));
  ipcMain.handle('visible-browser:close', () => visibleBrowserService.close());

  // Documents
  ipcMain.handle('document:read', (_, filePath) => documentService.readDocument(filePath));
  ipcMain.handle('document:create', (_, filePath, content) => documentService.createDocument(filePath, content));
  ipcMain.handle('document:organizePreview', (_, dir) => documentService.organizeFolderPreview(dir));
  ipcMain.handle('document:executeOrganization', (_, plan) => documentService.executeOrganization(plan));

  // Database / Memory
  ipcMain.handle('db:getMemories', (_, cat) => databaseService.getMemories(cat));
  ipcMain.handle('db:addMemory', (_, cat, key, val, imp) => databaseService.addMemory(cat, key, val, imp));
  ipcMain.handle('db:updateMemory', (_, id, key, val, imp) => databaseService.updateMemory(id, key, val, imp));
  ipcMain.handle('db:deleteMemory', (_, id) => databaseService.deleteMemory(id));
  ipcMain.handle('db:getTasks', (_, limit) => databaseService.getTasks(limit));
  ipcMain.handle('db:getTaskLogs', (_, taskId) => databaseService.getTaskLogs(taskId));
  ipcMain.handle('db:getNotes', () => databaseService.getNotes());
  ipcMain.handle('db:addNote', (_, t, c, tags) => databaseService.addNote(t, c, tags));
  ipcMain.handle('db:deleteNote', (_, id) => databaseService.deleteNote(id));
  ipcMain.handle('db:exportAllData', () => databaseService.exportAllData());

  // Settings
  ipcMain.handle('settings:get', () => settingsService.getSettings());
  ipcMain.handle('settings:update', (_, updates) => {
    const updated = settingsService.updateSettings(updates);
    if (updates.geminiApiKey !== undefined) {
      geminiService.setApiKey(updates.geminiApiKey);
    }
    return updated;
  });
  ipcMain.handle('gemini:testKey', (_, key, model) => geminiService.testConnection(key, model));

  // Gemini & AI
  ipcMain.handle('gemini:chat', (_, messages, systemInstruction, model) =>
    geminiService.chat(messages, systemInstruction, model)
  );
  ipcMain.handle('gemini:analyzeImage', (_, base64, mimeType, prompt) =>
    geminiService.analyzeImage(base64, mimeType, prompt)
  );
  ipcMain.handle('gemini:generateImage', (_, prompt) => geminiService.generateImage(prompt));

  // Agent
  ipcMain.handle('agent:startTask', (_, goal) => agentService.startTask(goal));
  ipcMain.handle('agent:pauseTask', (_, taskId) => agentService.pauseTask(taskId));
  ipcMain.handle('agent:resumeTask', (_, taskId) => agentService.resumeTask(taskId));
  ipcMain.handle('agent:cancelTask', (_, taskId) => agentService.cancelTask(taskId));
  ipcMain.handle('agent:emergencyStop', () => {
    agentService.emergencyStop();
    mainWindow?.webContents.send('agent:emergency-stop');
    return { success: true };
  });
  ipcMain.handle('agent:resetEmergencyStop', () => {
    agentService.resetEmergencyStop();
    return { success: true };
  });
}

app.whenReady().then(() => {
  setupIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  browserService.close();
  visibleBrowserService.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

