import React from 'react';
import {
  Cpu,
  Bot,
  Laptop,
  Globe,
  FileText,
  Eye,
  Database,
  Sparkles,
  ListTodo,
  Settings,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

export type TabType =
  | 'core'
  | 'agent'
  | 'laptop'
  | 'browser'
  | 'documents'
  | 'visual'
  | 'memory'
  | 'skills'
  | 'tasks'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isListening: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isListening,
  isMuted,
  onToggleMute,
  isSpeaking,
  onStopSpeaking,
}) => {
  const navItems: Array<{ id: TabType; label: string; icon: React.ElementType }> = [
    { id: 'core', label: 'JARVIS Core', icon: Cpu },
    { id: 'agent', label: 'AI Agent', icon: Bot },
    { id: 'laptop', label: 'Laptop Control', icon: Laptop },
    { id: 'browser', label: 'Browser Research', icon: Globe },
    { id: 'documents', label: 'Files & Docs', icon: FileText },
    { id: 'visual', label: 'Visual Hub', icon: Eye },
    { id: 'memory', label: 'Memory (SQLite)', icon: Database },
    { id: 'skills', label: 'Skills Matrix', icon: Sparkles },
    { id: 'tasks', label: 'Task Manager', icon: ListTodo },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-56 bg-[#040814] border-r border-cyan-500/20 flex flex-col justify-between select-none">
      {/* Top: Navigation Links */}
      <div className="py-3 px-2 flex-1 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[10px] font-mono tracking-widest text-cyan-400/50 uppercase">
          NAVIGATION PROTOCOLS
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                  : 'text-slate-400 hover:text-cyan-200 hover:bg-cyan-500/5 border border-transparent'
              }`}
            >
              {/* Active neon cyan accent bar */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-cyan-400 rounded-r shadow-[0_0_8px_#00f3ff]"></div>
              )}
              <Icon
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'
                }`}
              />
              <span className="truncate tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom: Audio / Voice State Monitor & Controls */}
      <div className="p-3 border-t border-cyan-500/20 bg-[#030611] space-y-2">
        <div className="text-[10px] font-mono text-cyan-400/60 tracking-wider flex justify-between items-center">
          <span>AUDIO LINK</span>
          <span className={isMuted ? 'text-rose-400' : 'text-cyan-400'}>
            {isMuted ? 'MUTED' : isListening ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Mic Toggle Button */}
          <button
            onClick={onToggleMute}
            className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded border text-xs font-mono transition-all ${
              isMuted
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/50'
                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50 shadow-[0_0_8px_rgba(0,243,255,0.15)]'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />}
            <span>{isMuted ? 'MUTED' : 'VOICE'}</span>
          </button>

          {/* Voice Speech Stop / Status */}
          <button
            onClick={onStopSpeaking}
            disabled={!isSpeaking}
            className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded border text-xs font-mono transition-all ${
              isSpeaking
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/50 animate-pulse'
                : 'bg-slate-900/40 border-slate-700/40 text-slate-500 cursor-default'
            }`}
            title={isSpeaking ? 'Click to stop voice output' : 'Speaker idle'}
          >
            {isSpeaking ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{isSpeaking ? 'SPEAKING' : 'IDLE'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

