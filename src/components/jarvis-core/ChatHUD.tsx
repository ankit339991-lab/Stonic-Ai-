import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, Bot, User, Sparkles, Terminal } from 'lucide-react';
import { ArcReactor } from './ArcReactor';
import { VoiceWave } from './VoiceWave';

export interface ChatEntry {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isAction?: boolean;
}

interface ChatHUDProps {
  messages: ChatEntry[];
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onToggleListening: () => void;
  onSpeakText: (text: string) => void;
  transcript?: string;
  wakeWordDetected?: boolean;
}

export const ChatHUD: React.FC<ChatHUDProps> = ({
  messages,
  onSendMessage,
  isThinking,
  isListening,
  isSpeaking,
  onToggleListening,
  onSpeakText,
  transcript,
  wakeWordDetected,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickActions = [
    { label: 'Open Google Chrome', cmd: 'Open Google Chrome' },
    { label: 'Check Battery', cmd: 'Tell me battery status' },
    { label: 'Take Screenshot', cmd: 'Take a screenshot' },
    { label: 'Show Storage', cmd: 'Show available storage' },
    { label: 'Search AI News', cmd: 'Find the latest AI news and summarize' },
    { label: 'Lock Laptop', cmd: 'Lock my laptop' },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid relative overflow-hidden">
      {/* Top Banner: Central Arc Reactor HUD */}
      <div className="py-2 px-4 border-b border-cyan-500/15 bg-gradient-to-b from-[#060c20]/90 to-transparent flex flex-col items-center justify-center relative">
        <div className="flex items-center justify-center space-x-6">
          {/* Left Telemetry Card */}
          <div className="hidden lg:flex flex-col space-y-1 text-right font-mono text-[11px] text-cyan-400/70 border-r border-cyan-500/20 pr-4">
            <span className="text-cyan-300 font-bold tracking-wider">AI SUBSYSTEM: ACTIVE</span>
            <span>VOICE RECOGNITION: {isListening ? 'LIVE' : 'STANDBY'}</span>
            <span>MODEL: GEMINI-2.0</span>
          </div>

          {/* Center Arc Reactor */}
          <div className="flex flex-col items-center">
            <ArcReactor
              size={140}
              isListening={isListening}
              isSpeaking={isSpeaking}
              isThinking={isThinking}
            />
            {/* Status / Wake Word Alert */}
            <div className="mt-1">
              {wakeWordDetected ? (
                <span className="px-3 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-xs font-bold tracking-widest animate-bounce shadow-[0_0_15px_#00f3ff]">
                  WAKE WORD DETECTED
                </span>
              ) : isThinking ? (
                <span className="text-xs font-mono text-cyan-300 tracking-widest animate-pulse">
                  // PROCESSING NEURAL INFERENCE...
                </span>
              ) : isListening ? (
                <span className="text-xs font-mono text-cyan-400 tracking-widest animate-pulse">
                  // AWAITING INSTRUCTION ("HEY JARVIS")...
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-400 tracking-widest">
                  JARVIS READY // SAY "HEY JARVIS" OR TYPE
                </span>
              )}
            </div>
          </div>

          {/* Right Waveform */}
          <div className="hidden lg:flex flex-col items-start border-l border-cyan-500/20 pl-4">
            <VoiceWave isActive={isListening || isSpeaking} />
            <span className="text-[10px] font-mono text-cyan-400/50 mt-1">AUDIO FREQ MONITOR</span>
          </div>
        </div>

        {/* Live speech interim transcript preview */}
        {transcript && (
          <div className="mt-2 px-3 py-1 rounded bg-cyan-950/60 border border-cyan-400/40 text-cyan-200 text-xs font-mono max-w-lg text-center animate-pulse">
            &ldquo;{transcript}&rdquo;
          </div>
        )}
      </div>

      {/* Center: Conversation Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 rounded-full bg-cyan-950/30 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-orbitron font-bold text-cyan-300">
                STONIC AI CORE ONLINE
              </h2>
              <p className="text-sm text-slate-400 max-w-md mt-1 font-sans">
                I am your personal Windows AI assistant. You can give me voice commands, ask
                complex multi-step tasks, automate laptop actions, or browse files.
              </p>
            </div>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap justify-center gap-2 max-w-xl pt-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(action.cmd)}
                  className="px-3 py-1.5 rounded-lg bg-[#071026] hover:bg-cyan-500/15 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 text-xs font-mono transition-all shadow-[0_0_10px_rgba(0,243,255,0.05)]"
                >
                  + {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.3)] shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl p-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-600/20 text-cyan-100 border border-cyan-400/40 rounded-tr-none shadow-[0_0_15px_rgba(0,243,255,0.15)] font-sans'
                    : 'bg-[#081128]/90 text-slate-100 border border-cyan-500/25 rounded-tl-none shadow-[0_0_20px_rgba(0,0,0,0.5)] font-sans'
                }`}
              >
                <div className="flex items-center justify-between space-x-4 mb-1 border-b border-cyan-500/10 pb-1">
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400/70 font-bold uppercase">
                    {msg.role === 'user' ? 'YOU' : 'STONIC AI (JARVIS)'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                    {msg.role === 'model' && (
                      <button
                        onClick={() => onSpeakText(msg.content)}
                        className="text-cyan-400/70 hover:text-cyan-300 p-0.5 transition-colors"
                        title="Replay Voice Response"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Body with clean markdown whitespace */}
                <div className="whitespace-pre-wrap select-text selection:bg-cyan-500/30 selection:text-white">
                  {msg.content}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-400/60 flex items-center justify-center text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)] shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isThinking && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-cyan-400 animate-spin-slow shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#081128] border border-cyan-500/30 rounded-xl rounded-tl-none p-3.5 text-xs font-mono text-cyan-300 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
              <span>Analyzing telemetry and formulating response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="p-3 bg-[#050a18] border-t border-cyan-500/20 space-y-2">
        {/* Quick Suggestion Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-cyan-500/50 flex items-center shrink-0">
            <Terminal className="w-3 h-3 mr-1" /> QUICK:
          </span>
          {quickActions.slice(0, 4).map((a, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(a.cmd)}
              className="px-2 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 text-cyan-300/80 hover:text-cyan-200 shrink-0 transition-colors"
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          {/* Push-To-Talk Mic Button */}
          <button
            type="button"
            onClick={onToggleListening}
            className={`p-2.5 rounded-xl border transition-all relative ${
              isListening
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(0,243,255,0.4)] animate-pulse'
                : 'bg-slate-900/80 border-cyan-500/20 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40'
            }`}
            title={isListening ? 'Click to stop listening' : 'Push-To-Talk / Start Listening'}
          >
            {isListening ? <Mic className="w-5 h-5 text-cyan-400" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Text Input Field */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a command or say 'Hey Jarvis'..."
            disabled={isThinking}
            className="flex-1 bg-[#070e22] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all font-sans"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-mono font-bold text-sm flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(0,243,255,0.3)]"
          >
            <span>SEND</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
