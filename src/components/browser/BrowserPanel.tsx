import React, { useState } from 'react';
import {
  Globe,
  Search,
  ExternalLink,
  BookOpen,
  FileText,
  Camera,
  Check,
  AlertTriangle,
  RotateCcw,
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

export const BrowserPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [targetUrl, setTargetUrl] = useState('');
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  const [researchReport, setResearchReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

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
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)]">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300">
              BROWSER AUTOMATION & WEB RESEARCH
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              PLAYWRIGHT HEADLESS BROWSER, SAFE SCRAPING & REPORT GENERATION
            </p>
          </div>
        </div>

        {(searchResults.length > 0 || scrapedData) && (
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold shadow-[0_0_12px_rgba(0,243,255,0.3)] transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>{isGeneratingReport ? 'COMPILING REPORT...' : 'COMPILE RESEARCH REPORT'}</span>
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="holo-panel rounded-xl p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-cyan-500/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Google / DuckDuckGo for live topics, articles, and documentation..."
              className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-cyan-500/40 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors"
          >
            <span>{isSearching ? 'SEARCHING...' : 'SEARCH WEB'}</span>
          </button>
        </form>
      </div>

      {/* Main Grid: Search Results (Left) & Webpage Reader / Report (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Search Results */}
        <div className="holo-panel rounded-xl p-4 space-y-3 flex flex-col">
          <div className="text-xs font-mono text-cyan-400/80 border-b border-cyan-500/20 pb-2 flex justify-between items-center">
            <span>RESEARCH SOURCES FOUND</span>
            <span>{searchResults.length} RESULTS</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {searchResults.length > 0 ? (
              searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#060d22] border border-cyan-500/20 hover:border-cyan-400/50 transition-all space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 hover:underline flex items-center space-x-1"
                    >
                      <span>{result.title}</span>
                      <ExternalLink className="w-3 h-3 ml-1 shrink-0 text-cyan-400" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {result.snippet}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-xs">
                      {result.url}
                    </span>
                    <button
                      onClick={() => handleScrape(result.url)}
                      className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-xs font-mono flex items-center space-x-1 transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>READ & EXTRACT</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs font-mono text-center">
                Enter a topic above to initiate browser research.
              </div>
            )}
          </div>
        </div>

        {/* Right: Webpage Reader & Report View */}
        <div className="holo-panel rounded-xl p-4 space-y-3 flex flex-col">
          <div className="text-xs font-mono text-cyan-400/80 border-b border-cyan-500/20 pb-2 flex justify-between items-center">
            <span>SCRAPED PAGE & EXTRACTION VIEW</span>
            {isScraping && <span className="text-cyan-400 animate-pulse">EXTRACTING...</span>}
          </div>

          {/* Direct URL input */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="Or enter direct URL (https://...)"
              className="flex-1 bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-cyan-500/40 focus:outline-none"
            />
            <button
              onClick={() => handleScrape()}
              disabled={!targetUrl.trim() || isScraping}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono"
            >
              SCRAPE
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[440px] space-y-3 pr-1">
            {scrapedData ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#060c1d] border border-cyan-500/20">
                  <h3 className="text-sm font-semibold text-cyan-300">{scrapedData.title}</h3>
                  <span className="text-[10px] font-mono text-slate-400">{scrapedData.url}</span>
                </div>

                {scrapedData.screenshotBase64 && (
                  <div className="rounded-lg overflow-hidden border border-cyan-500/30">
                    <img
                      src={scrapedData.screenshotBase64}
                      alt="Webpage Snapshot"
                      className="w-full h-auto object-cover max-h-48"
                    />
                    <div className="bg-[#040816] px-2 py-1 text-[10px] font-mono text-cyan-400 flex items-center justify-between">
                      <span className="flex items-center">
                        <Camera className="w-3 h-3 mr-1" /> HEADLESS BROWSER SNAPSHOT
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-[#060c1d] border border-cyan-500/20 text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto select-text">
                  {scrapedData.text}
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs font-mono text-center">
                No active webpage loaded. Click &quot;Read & Extract&quot; on any search result or enter a
                URL.
              </div>
            )}
          </div>
        </div>
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
