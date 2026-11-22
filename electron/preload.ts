import { contextBridge, ipcRenderer } from 'electron';

export const API = {
  // Window management
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // System controls
  getMetrics: () => ipcRenderer.invoke('system:getMetrics'),
  getBattery: () => ipcRenderer.invoke('system:getBattery'),
  getStorage: () => ipcRenderer.invoke('system:getStorage'),
  getInstalledApps: (forceRefresh?: boolean) => ipcRenderer.invoke('system:getInstalledApps', forceRefresh),
  openApp: (appName: string) => ipcRenderer.invoke('system:openApp', appName),
  playYouTube: (query: string) => ipcRenderer.invoke('system:playYouTube', query),
  sendWhatsApp: (target: string, message: string) => ipcRenderer.invoke('system:sendWhatsApp', target, message),
  searchGoogle: (query: string) => ipcRenderer.invoke('system:searchGoogle', query),
  adjustVolume: (action: 'up' | 'down' | 'mute' | 'unmute', amount?: number) =>
    ipcRenderer.invoke('system:adjustVolume', action, amount),
  takeScreenshot: () => ipcRenderer.invoke('system:takeScreenshot'),
  lockLaptop: () => ipcRenderer.invoke('system:lockLaptop'),
  searchFiles: (query: string, searchDir?: string, limit?: number) =>
    ipcRenderer.invoke('system:searchFiles', query, searchDir, limit),
  createFolder: (targetPath: string) => ipcRenderer.invoke('system:createFolder', targetPath),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('system:renameFile', oldPath, newPath),
  copyOrMoveFile: (src: string, dest: string, mode: 'copy' | 'move') =>
    ipcRenderer.invoke('system:copyOrMoveFile', src, dest, mode),
  openDocument: (filePath: string) => ipcRenderer.invoke('system:openDocument', filePath),

  // Browser automation
  searchWeb: (query: string, limit?: number) => ipcRenderer.invoke('browser:search', query, limit),
  scrapeWebpage: (url: string) => ipcRenderer.invoke('browser:scrape', url),

  // Document processing
  readDocument: (filePath: string) => ipcRenderer.invoke('document:read', filePath),
  createDocument: (filePath: string, content: string) => ipcRenderer.invoke('document:create', filePath, content),
  organizeFolderPreview: (folderPath: string) => ipcRenderer.invoke('document:organizePreview', folderPath),
  executeOrganization: (plan: Array<{ currentPath: string; proposedFolder: string }>) =>
    ipcRenderer.invoke('document:executeOrganization', plan),

  // SQLite Database & Memory
  getMemories: (category?: string) => ipcRenderer.invoke('db:getMemories', category),
  addMemory: (category: string, key: string, value: string, importance?: number) =>
    ipcRenderer.invoke('db:addMemory', category, key, value, importance),
  updateMemory: (id: number, key: string, value: string, importance: number) =>
    ipcRenderer.invoke('db:updateMemory', id, key, value, importance),
  deleteMemory: (id: number) => ipcRenderer.invoke('db:deleteMemory', id),
  getTasks: (limit?: number) => ipcRenderer.invoke('db:getTasks', limit),
  getTaskLogs: (taskId: string) => ipcRenderer.invoke('db:getTaskLogs', taskId),
  getNotes: () => ipcRenderer.invoke('db:getNotes'),
  addNote: (title: string, content: string, tags?: string) => ipcRenderer.invoke('db:addNote', title, content, tags),
  deleteNote: (id: number) => ipcRenderer.invoke('db:deleteNote', id),
  exportAllData: () => ipcRenderer.invoke('db:exportAllData'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (updates: any) => ipcRenderer.invoke('settings:update', updates),
  testApiKey: (apiKey: string, model?: string) => ipcRenderer.invoke('gemini:testKey', apiKey, model),

  // AI & Chat & Vision
  chat: (messages: any[], systemInstruction?: string, model?: string) =>
    ipcRenderer.invoke('gemini:chat', messages, systemInstruction, model),
  analyzeImage: (base64Data: string, mimeType: string, prompt: string) =>
    ipcRenderer.invoke('gemini:analyzeImage', base64Data, mimeType, prompt),
  generateImage: (prompt: string) => ipcRenderer.invoke('gemini:generateImage', prompt),

  // Autonomous Agent
  startAgentTask: (goal: string) => ipcRenderer.invoke('agent:startTask', goal),
  pauseAgentTask: (taskId: string) => ipcRenderer.invoke('agent:pauseTask', taskId),
  resumeAgentTask: (taskId: string) => ipcRenderer.invoke('agent:resumeTask', taskId),
  cancelAgentTask: (taskId: string) => ipcRenderer.invoke('agent:cancelTask', taskId),
  emergencyStop: () => ipcRenderer.invoke('agent:emergencyStop'),
  resetEmergencyStop: () => ipcRenderer.invoke('agent:resetEmergencyStop'),

  // Event Listeners
  onTaskUpdated: (callback: (task: any) => void) => {
    const handler = (_event: any, task: any) => callback(task);
    ipcRenderer.on('agent:task-updated', handler);
    return () => ipcRenderer.removeListener('agent:task-updated', handler);
  },
  onAgentLog: (callback: (log: any) => void) => {
    const handler = (_event: any, log: any) => callback(log);
    ipcRenderer.on('agent:log', handler);
    return () => ipcRenderer.removeListener('agent:log', handler);
  },
  onEmergencyStopTriggered: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('agent:emergency-stop', handler);
    return () => ipcRenderer.removeListener('agent:emergency-stop', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', API);

export type ElectronAPI = typeof API;

