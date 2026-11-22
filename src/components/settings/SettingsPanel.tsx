import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Volume2,
  Mic,
  Power,
  Shield,
  Check,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite');
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [wakeWord, setWakeWord] = useState('Hey Jarvis');
  const [listenWhenMinimized, setListenWhenMinimized] = useState(false);
  const [autoStartOnBoot, setAutoStartOnBoot] = useState(false);

  // Voice Settings
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [pitch, setPitch] = useState(1.0);
  const [rate, setRate] = useState(1.05);

  const [testStatus, setTestStatus] = useState<{ message: string; isError?: boolean } | null>(
    null
  );
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Load voices
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // Load persisted settings
    const loadSettings = async () => {
      try {
        const s = await window.electronAPI.getSettings();
        if (s.geminiApiKey) setApiKey(s.geminiApiKey);
        if (s.geminiModel) setSelectedModel(s.geminiModel);
        if (s.wakeWordEnabled !== undefined) setWakeWordEnabled(s.wakeWordEnabled);
        if (s.wakeWord) setWakeWord(s.wakeWord);
        if (s.listenWhenMinimized !== undefined) setListenWhenMinimized(s.listenWhenMinimized);
        if (s.autoStartOnBoot !== undefined) setAutoStartOnBoot(s.autoStartOnBoot);
        if (s.voiceSettings) {
          if (s.voiceSettings.voiceURI) setSelectedVoiceURI(s.voiceSettings.voiceURI);
          if (s.voiceSettings.pitch) setPitch(s.voiceSettings.pitch);
          if (s.voiceSettings.rate) setRate(s.voiceSettings.rate);
        }
      } catch (e) {
        console.error('Error loading settings', e);
      }
    };
    loadSettings();
  }, []);

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus({ message: 'Please enter a Gemini API Key to test.', isError: true });
      return;
    }
    setIsTestingKey(true);
    setTestStatus(null);

    try {
      const res = await window.electronAPI.testApiKey(apiKey.trim(), selectedModel);
      setTestStatus({ message: res.message, isError: !res.success });
    } catch (e: any) {
      setTestStatus({ message: `Test failed: ${e.message}`, isError: true });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(
      'डायग्नोस्टिक्स ऑनलाइन, सर। स्टोनिक एआई स्पीच सिंथेसिस पूरी क्षमता से कार्य कर रहा है।'
    );
    utt.lang = 'hi-IN';
    if (selectedVoiceURI) {
      const match = voices.find((v) => v.voiceURI === selectedVoiceURI);
      if (match) utt.voice = match;
    }
    utt.pitch = pitch;
    utt.rate = rate;
    window.speechSynthesis.speak(utt);
  };

  const handleSaveSettings = async () => {
    try {
      await window.electronAPI.updateSettings({
        geminiApiKey: apiKey.trim(),
        geminiModel: selectedModel,
        wakeWordEnabled,
        wakeWord: wakeWord.trim(),
        listenWhenMinimized,
        autoStartOnBoot,
        voiceSettings: {
          voiceURI: selectedVoiceURI,
          pitch,
          rate,
          volume: 1.0,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      alert(`Failed to save settings: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)]">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300">
              JARVIS SYSTEM CONFIGURATION
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              GEMINI API, SPEECH SYNTHESIS, WAKE-WORD & WINDOWS BEHAVIOR
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>SAVE CONFIGURATION</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-cyan-950/80 border border-cyan-400/60 text-cyan-200 text-xs font-mono flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>Configuration saved successfully and synced with Windows environment.</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Gemini AI Configuration */}
        <div className="holo-panel rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
            <Key className="w-4 h-4 mr-1.5 text-cyan-400" />
            GEMINI API & NEURAL MODEL
          </h2>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-300">GEMINI API KEY</label>
            <div className="flex items-center space-x-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <button
                onClick={handleTestApiKey}
                disabled={isTestingKey}
                className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono whitespace-nowrap"
              >
                {isTestingKey ? 'PINGING...' : 'TEST KEY'}
              </button>
            </div>
          </div>

          {testStatus && (
            <div
              className={`p-2.5 rounded-lg border text-xs font-mono ${
                testStatus.isError
                  ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                  : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
              }`}
            >
              {testStatus.message}
            </div>
          )}

          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-mono text-slate-300">ACTIVE AI MODEL</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none"
            >
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Recommended - Ultra Fast & Reliable)</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Advanced Intelligence)</option>
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Balanced Speed)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>
        </div>

        {/* 2. Voice & Speech Synthesis */}
        <div className="holo-panel rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center">
              <Volume2 className="w-4 h-4 mr-1.5 text-cyan-400" />
              VOICE & SPEECH SYNTHESIS (TTS)
            </span>
            <button
              onClick={handleTestVoice}
              className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono hover:bg-cyan-500/30"
            >
              TEST VOICE
            </button>
          </h2>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-300">VOICE SELECTOR</label>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg p-2 text-xs text-slate-100 font-sans focus:outline-none"
            >
              <option value="">Default (Auto-select Futuristic English Voice)</option>
              {voices
                .filter((v) => v.lang.startsWith('en'))
                .map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>PITCH</span>
                <span>{pitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>SPEAKING SPEED</span>
                <span>{rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* 3. Wake Word & Voice Activation */}
        <div className="holo-panel rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
            <Mic className="w-4 h-4 mr-1.5 text-cyan-400" />
            WAKE WORD & VOICE ACTIVATION
          </h2>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#040816] border border-cyan-500/15">
            <div>
              <div className="text-xs font-semibold text-slate-200">Continuous Wake Word</div>
              <div className="text-[11px] text-slate-400">
                Responds immediately when you speak the wake phrase
              </div>
            </div>
            <button
              onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                wakeWordEnabled ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full transition-transform ${
                  wakeWordEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-300">WAKE PHRASE</label>
            <input
              type="text"
              value={wakeWord}
              onChange={(e) => setWakeWord(e.target.value)}
              placeholder="Hey Jarvis"
              className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none"
            />
          </div>
        </div>

        {/* 4. Windows Startup & Tray Options */}
        <div className="holo-panel rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
            <Power className="w-4 h-4 mr-1.5 text-cyan-400" />
            WINDOWS DESKTOP & TRAY CONTROLS
          </h2>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#040816] border border-cyan-500/15">
            <div>
              <div className="text-xs font-semibold text-slate-200">Start with Windows</div>
              <div className="text-[11px] text-slate-400">Launch STONIC AI automatically on user login</div>
            </div>
            <button
              onClick={() => setAutoStartOnBoot(!autoStartOnBoot)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                autoStartOnBoot ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full transition-transform ${
                  autoStartOnBoot ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#040816] border border-cyan-500/15">
            <div>
              <div className="text-xs font-semibold text-slate-200">Listen When Minimized</div>
              <div className="text-[11px] text-slate-400">
                Continue listening to wake word when closed to system tray
              </div>
            </div>
            <button
              onClick={() => setListenWhenMinimized(!listenWhenMinimized)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                listenWhenMinimized ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full transition-transform ${
                  listenWhenMinimized ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-[11px] font-mono text-cyan-300/80 space-y-1">
            <div className="font-bold">GLOBAL HOTKEYS:</div>
            <div>• <span className="text-cyan-400">Ctrl + Shift + Space</span>: Focus Assistant</div>
            <div>• <span className="text-rose-400">Ctrl + Shift + Esc</span>: Emergency Stop Core</div>
          </div>
        </div>
      </div>
    </div>
  );
};

