import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  ExternalLink,
  BookOpen,
  FileText,
  Camera,
  Play,
  Pause,
  Square,
  Bot,
  Sparkles,
  Video,
  Power,
  VolumeX,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
} from 'lucide-react';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface ScrapedData {
  title: string;
  url: string;
  text: string;
  screenshotBase64?: string;
  links: Array<{ text: string; url: string }>;
}

interface VisibleBrowserStatus {
  isEnabled: boolean;
  isOpen: boolean;
  currentWebsite: string;
  currentAction: string;
  lastCommand: string;
  profilePath: string;
  logs: Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }>;
}

export const BrowserPanel: React.FC = () => {
  // Visible Browser Automation States
  const [browserStatus, setBrowserStatus] = useState<VisibleBrowserStatus>({
    isEnabled: true,
    isOpen: false,
    currentWebsite: 'None',
    currentAction: 'Idle',
    lastCommand: '',
    profilePath: 'stonic_chrome_profile',
    logs: [],
  });

  const [chatgptPrompt, setChatgptPrompt] = useState('');
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [googleQuery, setGoogleQuery] = useState('');
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastAiResponse, setLastAiResponse] = useState<{ title: string; content: string } | null>(null);

  // Existing Web Scraper & Research States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [researchReport, setResearchReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Load initial browser status and listen for live updates
  useEffect(() => {
    window.electronAPI.getVisibleBrowserStatus().then((status) => {
      if (status) setBrowserStatus(status);
    });

    const unsubscribe = window.electronAPI.onVisibleBrowserStatus((status) => {
      setBrowserStatus(status);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleToggleEnabled = async () => {
    const next = !browserStatus.isEnabled;
    await window.electronAPI.setVisibleBrowserEnabled(next);
    setBrowserStatus((prev) => ({ ...prev, isEnabled: next }));
  };

  const handleStopAutomation = async () => {
    await window.electronAPI.stopBrowserAutomation();
    setIsExecuting(false);
  };

  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleOpenWebsite = async (site: 'chatgpt' | 'gemini' | 'google' | 'youtube') => {
    setIsExecuting(true);
    try {
      await window.electronAPI.visibleBrowserOpen(site);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAskChatGPT = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatgptPrompt.trim() || isExecuting) return;
    setIsExecuting(true);
    setLastAiResponse(null);
    try {
      const res = await window.electronAPI.askChatGPT(chatgptPrompt.trim());
      if (res.success && res.answer) {
        setLastAiResponse({ title: 'ChatGPT Live Response', content: res.answer });
      }
      setChatgptPrompt('');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAskGemini = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!geminiPrompt.trim() || isExecuting) return;
    setIsExecuting(true);
    setLastAiResponse(null);
    try {
      const res = await window.electronAPI.askGemini(geminiPrompt.trim());
      if (res.success && res.answer) {
        setLastAiResponse({ title: 'Google Gemini Live Response', content: res.answer });
      }
      setGeminiPrompt('');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSearchGoogle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!googleQuery.trim() || isExecuting) return;
    setIsExecuting(true);
    try {
      const res = await window.electronAPI.visibleBrowserSearchGoogle(googleQuery.trim());
      if (res.summary) {
        setLastAiResponse({ title: `Google Search: "${googleQuery}"`, content: res.summary });
      }
      setGoogleQuery('');
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePlayYouTube = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!youtubeQuery.trim() || isExecuting) return;
    setIsExecuting(true);
    try {
      await window.electronAPI.visibleBrowserPlayYouTube(youtubeQuery.trim());
      setYoutubeQuery('');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleControlYouTube = async (action: 'pause' | 'resume' | 'stop') => {
    await window.electronAPI.visibleBrowserControlYouTube(action);
  };

  // Existing Headless Search & Scrape Handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const results = await window.electronAPI.searchWeb(searchQuery.trim(), 6);
      setSearchResults(results);
    } catch (e: any) {
      alert(`Search error: ${e.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleScrape = async (urlToScrape?: string) => {
    const url = urlToScrape || targetUrl.trim();
    if (!url || isScraping) return;
    setIsScraping(true);
    setTargetUrl(url);
    try {
      const data = await window.electronAPI.scrapeWebpage(url);
      setScrapedData(data);
    } catch (e: any) {
      alert(`Webpage read error: ${e.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleGenerateReport = async () => {
    if ((!scrapedData && searchResults.length === 0) || isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      const context = scrapedData
        ? `Page Title: ${scrapedData.title}\nURL: ${scrapedData.url}\nContent:\n${scrapedData.text.slice(0, 5000)}`
        : `Search Query: ${searchQuery}\nResults:\n${searchResults.map((r) => `- ${r.title} (${r.url}): ${r.snippet}`).join('\n')}`;

      const reportPrompt = `
Synthesize the following web intelligence into a professional, structured research report:
${context}

Format as:
# Executive Research Intelligence: ${searchQuery || scrapedData?.title}
## Key Findings & Core Insights
## Detailed Analysis
## Source References & Verification
      `.trim();

      const response = await window.electronAPI.chat([{ role: 'user', content: reportPrompt }]);
      setResearchReport(response);
    } catch (e: any) {
      alert(`Report generation error: ${e.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid overflow-y-auto p-4 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cyan-500/20 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.25)]">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300 flex items-center space-x-2">
              <span>VISIBLE BROWSER AUTOMATION SYSTEM</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PLAYWRIGHT CHROME
              </span>
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              VOICE & UI CONTROLLED LIVE GOOGLE CHROME WITH PERSISTENT LOGINS
            </p>
          </div>
        </div>

        {/* Global Controls & Emergency Interrupts */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleEnabled}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
              browserStatus.isEnabled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>AUTOMATION: {browserStatus.isEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleStopAutomation}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(244,63,94,0.2)]"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP AUTOMATION</span>
          </button>

          <button
            onClick={handleStopSpeaking}
            title="Stop Speech Output Immediately"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold transition-all"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>STOP SPEAKING</span>
          </button>
        </div>
      </div>

      {/* Real-time Telemetry & Status Badges Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="holo-panel rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-mono text-cyan-400/60 block uppercase">BROWSER WINDOW</span>
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                browserStatus.isOpen ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
              }`}
            />
            <span className="text-sm font-orbitron font-bold text-slate-100">
              {browserStatus.isOpen ? 'CHROME ACTIVE' : 'IDLE / READY'}
            </span>
          </div>
        </div>

        <div className="holo-panel rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-mono text-cyan-400/60 block uppercase">CURRENT WEBSITE</span>
          <div className="text-sm font-orbitron font-bold text-cyan-300 truncate">
            {browserStatus.currentWebsite || 'None'}
          </div>
        </div>

        <div className="holo-panel rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-mono text-cyan-400/60 block uppercase">CURRENT ACTION</span>
          <div className="text-sm font-mono text-slate-200 truncate flex items-center space-x-1.5">
            {isExecuting && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin flex-shrink-0" />}
            <span className="truncate">{browserStatus.currentAction}</span>
          </div>
        </div>

        <div className="holo-panel rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-mono text-cyan-400/60 block uppercase">PROFILE & LOGIN</span>
          <div className="text-xs font-mono text-emerald-400 truncate flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">PERSISTENT SESSION SAVED</span>
          </div>
        </div>
      </div>

      {/* 4 Interactive Visible Automation Cards: ChatGPT, Gemini, Google, YouTube */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: ChatGPT Automation */}
        <div className="holo-panel rounded-xl p-4 space-y-3 border-emerald-500/30">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xs font-orbitron font-bold text-emerald-300 tracking-wider">
                1. CHATGPT VISIBLE AUTOMATION
              </h2>
            </div>
            <button
              onClick={() => handleOpenWebsite('chatgpt')}
              disabled={isExecuting}
              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center space-x-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>OPEN CHATGPT</span>
            </button>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Voice: <span className="text-emerald-300">&quot;Hey Jarvis, Ask ChatGPT [question]&quot;</span>
          </p>
          <form onSubmit={handleAskChatGPT} className="space-y-2">
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={chatgptPrompt}
                onChange={(e) => setChatgptPrompt(e.target.value)}
                placeholder="Ask ChatGPT anything (types & extracts automatically)..."
                className="flex-1 bg-[#060e22] border border-emerald-500/30 focus:border-emerald-400 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-emerald-500/40 focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={!chatgptPrompt.trim() || isExecuting}
                className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-1 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ASK</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Google Gemini Automation */}
        <div className="holo-panel rounded-xl p-4 space-y-3 border-purple-500/30">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-xs font-orbitron font-bold text-purple-300 tracking-wider">
                2. GOOGLE GEMINI VISIBLE AUTOMATION
              </h2>
            </div>
            <button
              onClick={() => handleOpenWebsite('gemini')}
              disabled={isExecuting}
              className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[11px] font-mono flex items-center space-x-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>OPEN GEMINI</span>
            </button>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Voice: <span className="text-purple-300">&quot;Hey Jarvis, Ask Gemini [question]&quot;</span>
          </p>
          <form onSubmit={handleAskGemini} className="space-y-2">
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={geminiPrompt}
                onChange={(e) => setGeminiPrompt(e.target.value)}
                placeholder="Ask Gemini anything (types & extracts automatically)..."
                className="flex-1 bg-[#060e22] border border-purple-500/30 focus:border-purple-400 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-purple-500/40 focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={!geminiPrompt.trim() || isExecuting}
                className="px-3.5 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 text-xs font-mono font-bold flex items-center space-x-1 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ASK</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card 3: Google Search Automation */}
        <div className="holo-panel rounded-xl p-4 space-y-3 border-blue-500/30">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-blue-400" />
              <h2 className="text-xs font-orbitron font-bold text-blue-300 tracking-wider">
                3. GOOGLE SEARCH VISIBLE AUTOMATION
              </h2>
            </div>
            <button
              onClick={() => handleOpenWebsite('google')}
              disabled={isExecuting}
              className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[11px] font-mono flex items-center space-x-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>OPEN GOOGLE</span>
            </button>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Voice: <span className="text-blue-300">&quot;Search Google for [query]&quot;</span>
          </p>
          <form onSubmit={handleSearchGoogle} className="space-y-2">
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={googleQuery}
                onChange={(e) => setGoogleQuery(e.target.value)}
                placeholder="Search Google visibly & read results..."
                className="flex-1 bg-[#060e22] border border-blue-500/30 focus:border-blue-400 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-blue-500/40 focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={!googleQuery.trim() || isExecuting}
                className="px-3.5 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 text-xs font-mono font-bold flex items-center space-x-1 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>SEARCH</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card 4: YouTube Automation */}
        <div className="holo-panel rounded-xl p-4 space-y-3 border-rose-500/30">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-rose-400" />
              <h2 className="text-xs font-orbitron font-bold text-rose-300 tracking-wider">
                4. YOUTUBE VISIBLE AUTOMATION & CONTROLS
              </h2>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleControlYouTube('pause')}
                title="Pause YouTube"
                className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
              >
                <Pause className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleControlYouTube('resume')}
                title="Resume YouTube"
                className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
              >
                <Play className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleControlYouTube('stop')}
                title="Stop YouTube"
                className="p-1 rounded bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 border border-slate-500/40"
              >
                <Square className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Voice: <span className="text-rose-300">&quot;Search YouTube for Kesariya and play it&quot;</span>
          </p>
          <form onSubmit={handlePlayYouTube} className="space-y-2">
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={youtubeQuery}
                onChange={(e) => setYoutubeQuery(e.target.value)}
                placeholder="Song or video title to search & play..."
                className="flex-1 bg-[#060e22] border border-rose-500/30 focus:border-rose-400 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-rose-400/40 focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={!youtubeQuery.trim() || isExecuting}
                className="px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold flex items-center space-x-1 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Extracted AI Response Viewer */}
      {lastAiResponse && (
        <div className="holo-panel rounded-xl p-4 space-y-2.5 border-cyan-400/40 shadow-[0_0_20px_rgba(0,243,255,0.15)] animate-fadeIn">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-orbitron font-bold text-cyan-200 uppercase">
                {lastAiResponse.title}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(lastAiResponse.content)}
                className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-[11px] font-mono"
              >
                COPY TEXT
              </button>
              <button
                onClick={handleStopSpeaking}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-mono"
              >
                STOP AUDIO
              </button>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#040817] text-xs font-sans text-slate-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap select-text border border-cyan-500/10">
            {lastAiResponse.content}
          </div>
        </div>
      )}

      {/* Live Activity Log & Voice Command Console */}
      <div className="holo-panel rounded-xl p-4 space-y-2.5">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-mono text-cyan-300 uppercase tracking-wider font-bold">
              BROWSER AUTOMATION ACTIVITY LOG & VOICE AUDIT
            </h2>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/60">
            PROFILE: {browserStatus.profilePath.split('\\').pop() || 'stonic_chrome_profile'}
          </span>
        </div>

        <div className="bg-[#020614] rounded-lg p-3 font-mono text-xs max-h-40 overflow-y-auto space-y-1.5 border border-cyan-500/20">
          {browserStatus.logs.length > 0 ? (
            browserStatus.logs.map((log, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <span className="text-slate-500 text-[10px] flex-shrink-0">[{log.timestamp}]</span>
                <span
                  className={
                    log.type === 'error'
                      ? 'text-rose-400 font-semibold'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : 'text-cyan-300'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className="text-slate-500 text-[11px] italic">
              No browser actions executed yet. Say &quot;Hey Jarvis, Open ChatGPT&quot; or click above to start.
            </div>
          )}
        </div>
      </div>

      {/* PRESERVED: Headless Web Scraper & Research Synthesis Section */}
      <div className="holo-panel rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-orbitron font-bold text-cyan-300 tracking-wider">
              HEADLESS RESEARCH AGENT & SYNTHESIS (PRESERVED)
            </h2>
          </div>
          {(searchResults.length > 0 || scrapedData) && (
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isGeneratingReport ? 'COMPILING REPORT...' : 'COMPILE RESEARCH REPORT'}</span>
            </button>
          )}
        </div>

        {/* Headless Search Form */}
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-cyan-500/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search web for documents, articles & data..."
              className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-cyan-500/40 focus:outline-none font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold"
          >
            {isSearching ? 'SEARCHING...' : 'SEARCH WEB'}
          </button>
        </form>

        {/* Search Results Grid */}
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-[#060d22] border border-cyan-500/20 hover:border-cyan-400/40 flex items-center justify-between"
              >
                <div className="truncate pr-2">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-cyan-300 hover:underline truncate block"
                  >
                    {result.title}
                  </a>
                  <p className="text-[11px] text-slate-400 truncate">{result.snippet}</p>
                </div>
                <button
                  onClick={() => handleScrape(result.url)}
                  className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-[11px] font-mono flex-shrink-0"
                >
                  SCRAPE
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generated Report Section */}
      {researchReport && (
        <div className="holo-panel rounded-xl p-4 space-y-3 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-orbitron font-semibold text-purple-200">
                COMPILED AI RESEARCH SYNTHESIS
              </h2>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(researchReport);
                alert('Research report copied to clipboard.');
              }}
              className="px-3 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-mono transition-colors"
            >
              COPY REPORT
            </button>
          </div>
          <div className="text-xs font-sans text-slate-200 leading-relaxed whitespace-pre-wrap select-text p-3 bg-[#05091a] rounded-lg border border-purple-500/20 max-h-80 overflow-y-auto">
            {researchReport}
          </div>
        </div>
      )}
    </div>
  );
};
