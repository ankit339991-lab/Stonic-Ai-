import React, { useState, useEffect } from 'react';
import { Minus, Square, X, ShieldAlert, Cpu, Radio, ShieldCheck } from 'lucide-react';

interface TitleBarProps {
  isEmergencyStopped: boolean;
  onEmergencyStop: () => void;
  onResetEmergencyStop: () => void;
  isListening: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  isEmergencyStopped,
  onEmergencyStop,
  onResetEmergencyStop,
  isListening,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  return (
    <header className="h-10 bg-[#050a17] border-b border-cyan-500/20 flex items-center justify-between px-3 select-none drag-region z-50">
      {/* Left: Branding & Status */}
      <div className="flex items-center space-x-3 no-drag">
        <div className="flex items-center space-x-2">
          {/* Glowing Animated Arc Icon */}
          <div className="relative w-5 h-5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-cyan-400 animate-spin-slow"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f3ff]"></div>
          </div>
          <span className="font-orbitron font-bold text-sm tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]">
            STONIC AI
          </span>
          <span className="text-[10px] tracking-widest text-cyan-500/60 font-mono hidden sm:inline">
            // MARK-VII
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[11px] font-mono">
          {isEmergencyStopped ? (
            <span className="flex items-center text-rose-400 font-bold animate-pulse">
              <ShieldAlert className="w-3 h-3 mr-1" /> STOPPED
            </span>
          ) : isListening ? (
            <span className="flex items-center text-cyan-300">
              <Radio className="w-3 h-3 mr-1 text-cyan-400 animate-pulse" /> LISTENING
            </span>
          ) : (
            <span className="flex items-center text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] mr-1.5"></span>
              ONLINE
            </span>
          )}
        </div>
      </div>

      {/* Center: Futuristic Telemetry Clock */}
      <div className="hidden md:flex items-center space-x-4 text-xs font-mono text-cyan-300/70">
        <div className="flex items-center space-x-1">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>NEURAL CORE: OPTIMAL</span>
        </div>
        <span className="text-cyan-500/40">|</span>
        <span className="tracking-widest text-cyan-400 font-bold">{timeStr}</span>
      </div>

      {/* Right: Emergency Stop & Window Controls */}
      <div className="flex items-center space-x-2 no-drag">
        {/* Emergency Stop Button */}
        {isEmergencyStopped ? (
          <button
            onClick={onResetEmergencyStop}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-mono transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            title="Reset Emergency Stop"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RESET CORE</span>
          </button>
        ) : (
          <button
            onClick={onEmergencyStop}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 text-xs font-mono transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)] group"
            title="Emergency Stop (Halts all Agent tasks) [Ctrl+Shift+Esc]"
          >
            <ShieldAlert className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="font-bold tracking-wider">STOP</span>
          </button>
        )}

        <div className="h-4 w-px bg-cyan-500/20 mx-1"></div>

        {/* Windows Standard Controls */}
        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center text-cyan-400/80 hover:text-rose-200 hover:bg-rose-500/80 rounded transition-colors"
          title="Close (Minimizes to tray if enabled)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

