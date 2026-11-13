import React, { useState } from 'react';
import {
  Laptop,
  Volume2,
  VolumeX,
  Volume1,
  Camera,
  Lock,
  Battery,
  HardDrive,
  FolderPlus,
  Search,
  ExternalLink,
  Globe,
  Video,
  MessageSquare,
  FileCode,
  Calculator,
  Folder,
  Settings as SettingsIcon,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useSystemStatus } from '../../hooks/useSystemStatus';
import { ConfirmModal } from '../common/ConfirmModal';

export const LaptopDashboard: React.FC = () => {
  const { telemetry, refresh } = useSystemStatus(3000);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  const showFeedback = (text: string, isError = false) => {
    setFeedbackMsg({ text, isError });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleOpenApp = async (appName: string) => {
    try {
      const res = await window.electronAPI.openApp(appName);
      showFeedback(res.message, !res.success);
    } catch (e: any) {
      showFeedback(`Failed to open ${appName}: ${e.message}`, true);
    }
  };

  const handleVolume = async (action: 'up' | 'down' | 'mute' | 'unmute', amount = 6) => {
    try {
      const res = await window.electronAPI.adjustVolume(action, amount);
      showFeedback(res.message, !res.success);
    } catch (e: any) {
      showFeedback(`Volume error: ${e.message}`, true);
    }
  };

  const handleScreenshot = async () => {
    showFeedback('Capturing desktop screenshot...');
    try {
      const res = await window.electronAPI.takeScreenshot();
      if (res.success && res.dataUrl) {
        setScreenshotPreview(res.dataUrl);
        showFeedback(`Screenshot captured! Saved to ${res.path}`);
      } else {
        showFeedback(`Screenshot error: ${res.error}`, true);
      }
    } catch (e: any) {
      showFeedback(`Failed to take screenshot: ${e.message}`, true);
    }
  };

  const handleLockLaptop = async () => {
    setShowLockConfirm(false);
    try {
      const res = await window.electronAPI.lockLaptop();
      showFeedback(res.message, !res.success);
    } catch (e: any) {
      showFeedback(`Failed to lock laptop: ${e.message}`, true);
    }
  };

  const handleFileSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const items = await window.electronAPI.searchFiles(searchQuery.trim());
      setSearchResults(items);
      showFeedback(`Found ${items.length} file(s) matching "${searchQuery}"`);
    } catch (e: any) {
      showFeedback(`Search error: ${e.message}`, true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      // Create folder on user's Desktop or Documents
      const target = `C:\\Users\\Dell\\Desktop\\${newFolderName.trim()}`;
      const res = await window.electronAPI.createFolder(target);
      if (res.success) {
        showFeedback(res.message);
        setNewFolderName('');
      } else {
        showFeedback(res.message, true);
      }
    } catch (e: any) {
      showFeedback(`Failed to create folder: ${e.message}`, true);
    }
  };

  const handleOpenDocument = async (filePath: string) => {
    try {
      const res = await window.electronAPI.openDocument(filePath);
      showFeedback(res.message, !res.success);
    } catch (e: any) {
      showFeedback(`Failed to open: ${e.message}`, true);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)]">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300">
              WINDOWS LAPTOP CONTROL DECK
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              SAFE HARDWARE CONTROLS, TELEMETRY & SYSTEM APPS
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLockConfirm(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-mono transition-all shadow-[0_0_10px_rgba(244,63,94,0.2)]"
        >
          <Lock className="w-4 h-4" />
          <span>LOCK LAPTOP</span>
        </button>
      </div>

      {/* Floating Action Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between animate-fadeIn ${
            feedbackMsg.isError
              ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
              : 'bg-cyan-950/60 border-cyan-400/60 text-cyan-200 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMsg.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <Check className="w-4 h-4 text-cyan-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* System Telemetry Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Battery Card */}
        <div className="holo-panel rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-cyan-400/70 text-xs font-mono">
            <span className="flex items-center">
              <Battery className="w-4 h-4 mr-1 text-cyan-400" /> BATTERY
            </span>
            <span className={telemetry.battery.charging ? 'text-emerald-400' : 'text-cyan-300'}>
              {telemetry.battery.charging ? 'CHARGING' : 'BATTERY'}
            </span>
          </div>
          <div className="text-2xl font-orbitron font-bold text-slate-100">
            {telemetry.battery.percent}%
          </div>
          <div className="w-full h-1.5 bg-[#060e22] rounded-full overflow-hidden border border-cyan-500/20">
            <div
              className={`h-full transition-all duration-500 ${
                telemetry.battery.percent > 20 ? 'bg-cyan-400' : 'bg-rose-500'
              }`}
              style={{ width: `${telemetry.battery.percent}%` }}
            />
          </div>
        </div>

        {/* CPU Load */}
        <div className="holo-panel rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-cyan-400/70 text-xs font-mono">
            <span>CPU ACTIVITY</span>
            <span className="text-cyan-400">ACTIVE</span>
          </div>
          <div className="text-2xl font-orbitron font-bold text-slate-100">
            {telemetry.cpuUsage}%
          </div>
          <div className="w-full h-1.5 bg-[#060e22] rounded-full overflow-hidden border border-cyan-500/20">
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${telemetry.cpuUsage}%` }}
            />
          </div>
        </div>

        {/* Memory Load */}
        <div className="holo-panel rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-cyan-400/70 text-xs font-mono">
            <span>RAM CAPACITY</span>
            <span className="text-cyan-400">
              {telemetry.usedMemoryGB} / {telemetry.totalMemoryGB} GB
            </span>
          </div>
          <div className="text-2xl font-orbitron font-bold text-slate-100">
            {telemetry.memoryUsagePercent}%
          </div>
          <div className="w-full h-1.5 bg-[#060e22] rounded-full overflow-hidden border border-cyan-500/20">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${telemetry.memoryUsagePercent}%` }}
            />
          </div>
        </div>

        {/* Storage Drives */}
        <div className="holo-panel rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-cyan-400/70 text-xs font-mono">
            <span className="flex items-center">
              <HardDrive className="w-4 h-4 mr-1 text-cyan-400" /> DISK STORAGE
            </span>
            <span>{telemetry.storage[0]?.drive || 'C:\\'}</span>
          </div>
          <div className="text-2xl font-orbitron font-bold text-slate-100">
            {telemetry.storage[0]?.free_gb || 40} GB FREE
          </div>
          <div className="w-full h-1.5 bg-[#060e22] rounded-full overflow-hidden border border-cyan-500/20">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${telemetry.storage[0]?.percent_used || 80}%` }}
            />
          </div>
        </div>
      </div>

      {/* App Launcher Allowlist Grid */}
      <div className="holo-panel rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
          <ExternalLink className="w-4 h-4 mr-1.5 text-cyan-400" />
          QUICK APPLICATION LAUNCHER (WINDOWS INTEGRATION)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
          {[
            { name: 'Google Chrome', icon: Globe, cmd: 'chrome' },
            { name: 'YouTube', icon: Video, cmd: 'youtube' },
            { name: 'WhatsApp', icon: MessageSquare, cmd: 'whatsapp' },
            { name: 'Notepad', icon: FileCode, cmd: 'notepad' },
            { name: 'Calculator', icon: Calculator, cmd: 'calc' },
            { name: 'File Explorer', icon: Folder, cmd: 'explorer' },
            { name: 'Settings', icon: SettingsIcon, cmd: 'settings' },
            { name: 'PowerShell', icon: Laptop, cmd: 'powershell' },
          ].map((app, i) => {
            const Icon = app.icon;
            return (
              <button
                key={i}
                onClick={() => handleOpenApp(app.cmd)}
                className="p-3 rounded-xl bg-[#060e24] hover:bg-cyan-500/15 border border-cyan-500/20 hover:border-cyan-400 flex flex-col items-center justify-center space-y-2 transition-all group shadow-[0_0_10px_rgba(0,0,0,0.3)]"
              >
                <Icon className="w-6 h-6 text-cyan-400 group-hover:scale-110 group-hover:text-cyan-300 transition-transform" />
                <span className="text-[11px] font-mono text-slate-300 group-hover:text-white truncate max-w-full">
                  {app.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hardware Tools Row: Volume & Screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Volume Controls */}
        <div className="holo-panel rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/80">
            <span className="flex items-center">
              <Volume2 className="w-4 h-4 mr-1 text-cyan-400" /> LAPTOP AUDIO LEVEL
            </span>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={() => handleVolume('down', 6)}
              className="flex-1 py-2 rounded-lg bg-[#071128] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors flex items-center justify-center space-x-1"
            >
              <Volume1 className="w-4 h-4" />
              <span>VOLUME -</span>
            </button>
            <button
              onClick={() => handleVolume('up', 6)}
              className="flex-1 py-2 rounded-lg bg-[#071128] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors flex items-center justify-center space-x-1"
            >
              <Volume2 className="w-4 h-4" />
              <span>VOLUME +</span>
            </button>
            <button
              onClick={() => handleVolume('mute')}
              className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-mono transition-colors flex items-center justify-center space-x-1"
            >
              <VolumeX className="w-4 h-4" />
              <span>MUTE</span>
            </button>
          </div>
        </div>

        {/* Screenshot Capture & Preview */}
        <div className="holo-panel rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/80">
            <span className="flex items-center">
              <Camera className="w-4 h-4 mr-1 text-cyan-400" /> SCREENSHOT CAPTURE
            </span>
            <button
              onClick={handleScreenshot}
              className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold flex items-center space-x-1 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>CAPTURE NOW</span>
            </button>
          </div>

          {screenshotPreview ? (
            <div className="relative rounded-lg overflow-hidden border border-cyan-500/30 max-h-36">
              <img
                src={screenshotPreview}
                alt="Screenshot Preview"
                className="w-full h-auto object-cover"
              />
              <span className="absolute bottom-1 right-1 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400">
                SAVED TO USER PICTURES
              </span>
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center border border-dashed border-cyan-500/20 rounded-lg text-slate-500 text-xs font-mono">
              Click &quot;Capture Now&quot; to capture full screen
            </div>
          )}
        </div>
      </div>

      {/* File Search & Folder Operations */}
      <div className="holo-panel rounded-xl p-4 space-y-4">
        <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
          <Search className="w-4 h-4 mr-1.5 text-cyan-400" />
          FILE MANAGEMENT & DIRECTORY SEARCH
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Search Form */}
          <form onSubmit={handleFileSearch} className="flex items-center space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file name (e.g. 'report', '.pdf')..."
              className="flex-1 bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-cyan-500/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono flex items-center space-x-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSearching ? 'SEARCHING...' : 'SEARCH'}</span>
            </button>
          </form>

          {/* Create Folder Form */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name on Desktop..."
              className="flex-1 bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-cyan-500/40 focus:outline-none"
            />
            <button
              onClick={handleCreateFolder}
              className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center space-x-1"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>CREATE FOLDER</span>
            </button>
          </div>
        </div>

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div className="border border-cyan-500/20 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050b1c] text-cyan-400/70 border-b border-cyan-500/20">
                <tr>
                  <th className="p-2">FILE NAME</th>
                  <th className="p-2">PATH</th>
                  <th className="p-2">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {searchResults.map((file, idx) => (
                  <tr key={idx} className="hover:bg-cyan-500/5 text-slate-300">
                    <td className="p-2 font-medium text-cyan-300 flex items-center space-x-1">
                      <FileCode className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                      <span>{file.name}</span>
                    </td>
                    <td className="p-2 text-slate-400 truncate max-w-xs">{file.path}</td>
                    <td className="p-2">
                      <button
                        onClick={() => handleOpenDocument(file.path)}
                        className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[11px]"
                      >
                        OPEN
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lock Laptop Confirmation Dialog */}
      <ConfirmModal
        isOpen={showLockConfirm}
        title="Lock Laptop Workstation"
        message="Are you sure you want STONIC AI to lock your Windows laptop session? You will need your Windows password or PIN to unlock."
        confirmLabel="Lock Workstation"
        isDangerous={false}
        onConfirm={handleLockLaptop}
        onCancel={() => setShowLockConfirm(false)}
      />
    </div>
  );
};
