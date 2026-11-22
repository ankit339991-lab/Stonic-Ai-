import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Image as ImageIcon,
  Sparkles,
  GitBranch,
  Upload,
  Download,
  Check,
  AlertCircle,
  Copy,
  RefreshCw,
} from 'lucide-react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#04091a',
    primaryColor: '#00f3ff',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#00f3ff',
    lineColor: '#00f3ff',
    secondaryColor: '#0066ff',
    tertiaryColor: '#10b981',
  },
});

export const VisualHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'imageGen' | 'vision' | 'diagrams'>('imageGen');

  // 1. Image Generation State
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<{ path?: string; dataUrl?: string } | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentImages, setRecentImages] = useState<Array<{ prompt: string; dataUrl: string }>>([]);

  // 2. Vision Understanding State
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [visionPrompt, setVisionPrompt] = useState('Analyze this image in detail and describe all components, text, and context.');
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 3. Diagram State (Mermaid)
  const [diagramType, setDiagramType] = useState<'flowchart' | 'mindmap' | 'sequence'>('flowchart');
  const [diagramCode, setDiagramCode] = useState<string>(`
graph TD
    A[User Voice Command: 'Hey Jarvis'] --> B[Voice Processing Engine]
    B --> C{Intent Classifier}
    C -->|System Command| D[Windows Hardware & Apps]
    C -->|Complex Goal| E[Autonomous AI Agent]
    C -->|Web Research| F[Playwright Browser Engine]
    D --> G[Response Synthesized]
    E --> G
    F --> G
    G --> H[Speech Synthesis Audio Output]
  `.trim());
  const [diagramSvg, setDiagramSvg] = useState<string>('');
  const [diagramError, setDiagramError] = useState<string | null>(null);

  // Render diagram whenever code changes
  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        setDiagramError(null);
        const id = `mermaid_${Date.now()}`;
        const { svg } = await mermaid.render(id, diagramCode);
        if (isMounted) {
          setDiagramSvg(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          setDiagramError(err.message || 'Syntax error in diagram definition');
        }
      }
    };

    if (activeSubTab === 'diagrams') {
      renderDiagram();
    }

    return () => {
      isMounted = false;
    };
  }, [diagramCode, activeSubTab]);

  // Handle Real AI Image Generation
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const res = await window.electronAPI.generateImage(imagePrompt.trim());
      if (res.success && res.dataUrl) {
        setGeneratedImage(res);
        setRecentImages((prev) => [
          { prompt: imagePrompt.trim(), dataUrl: res.dataUrl! },
          ...prev.slice(0, 5),
        ]);
      } else {
        alert(`Generation error: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Vision File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImageBase64(reader.result as string);
        setVisionAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Vision Analysis
  const handleAnalyzeVision = async () => {
    if (!selectedImageBase64 || isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      const mimeType = selectedImageBase64.substring(
        selectedImageBase64.indexOf(':') + 1,
        selectedImageBase64.indexOf(';')
      );
      const res = await window.electronAPI.analyzeImage(
        selectedImageBase64,
        mimeType,
        visionPrompt
      );
      setVisionAnalysis(res);
    } catch (e: any) {
      alert(`Vision analysis error: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid overflow-y-auto p-4 space-y-4">
      {/* Header & Sub-tab Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)]">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300">
              STONIC VISUAL INTELLIGENCE HUB
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              REAL AI IMAGE SYNTHESIS, MULTIMODAL VISION & INTERACTIVE DIAGRAMS
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center space-x-1.5 p-1 rounded-lg bg-[#050b1c] border border-cyan-500/30">
          <button
            onClick={() => setActiveSubTab('imageGen')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeSubTab === 'imageGen'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI IMAGE GENERATOR
          </button>
          <button
            onClick={() => setActiveSubTab('vision')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeSubTab === 'vision'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            IMAGE UNDERSTANDING
          </button>
          <button
            onClick={() => setActiveSubTab('diagrams')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeSubTab === 'diagrams'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            INTERACTIVE DIAGRAMS
          </button>
        </div>
      </div>

      {/* 1. REAL AI IMAGE GENERATION */}
      {activeSubTab === 'imageGen' && (
        <div className="space-y-4">
          <div className="holo-panel rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5 text-cyan-400" />
              GENERATE REAL HIGH-RESOLUTION AI VISUALS
            </h2>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image (e.g. 'Futuristic holographic Iron Man HUD in cyberpunk laboratory, 8k resolution')..."
                className="flex-1 bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-cyan-500/40 focus:outline-none"
              />
              <button
                onClick={handleGenerateImage}
                disabled={!imagePrompt.trim() || isGenerating}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono font-bold text-sm flex items-center space-x-2 shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'SYNTHESIZING...' : 'GENERATE IMAGE'}</span>
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="flex items-center space-x-2 overflow-x-auto text-xs font-mono pt-1">
              <span className="text-cyan-500/60 shrink-0">PROMPT IDEAS:</span>
              {[
                'Futuristic cybernetic core with blue plasma rings 8k',
                'Holographic world map data telemetry HUD',
                'Sleek modern AI assistant interface glowing cyan',
              ].map((p, i) => (
                <button
                  key={i}
                  onClick={() => setImagePrompt(p)}
                  className="px-2 py-1 rounded bg-[#071128] hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-300 shrink-0"
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Image Showcase */}
          {generatedImage?.dataUrl && (
            <div className="holo-panel rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <span className="text-xs font-mono text-cyan-300">
                  REAL AI IMAGE OUTPUT (1024x1024)
                </span>
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-md">
                  {generatedImage.filePath}
                </span>
              </div>

              <div className="flex justify-center bg-[#02050f] p-3 rounded-lg border border-cyan-500/20">
                <img
                  src={generatedImage.dataUrl}
                  alt="Generated AI Visual"
                  className="max-h-[460px] rounded-lg object-contain shadow-[0_0_30px_rgba(0,243,255,0.2)]"
                />
              </div>
            </div>
          )}

          {/* Recent Images Carousel */}
          {recentImages.length > 0 && (
            <div className="holo-panel rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-mono text-cyan-400/70">RECENTLY GENERATED</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {recentImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setGeneratedImage({ dataUrl: img.dataUrl })}
                    className="cursor-pointer group relative rounded-lg overflow-hidden border border-cyan-500/20 hover:border-cyan-400 transition-all"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.prompt}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
                      <p className="text-[10px] font-mono text-cyan-300 truncate">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. IMAGE UNDERSTANDING / VISION */}
      {activeSubTab === 'vision' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="holo-panel rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
              <Upload className="w-4 h-4 mr-1.5 text-cyan-400" />
              UPLOAD IMAGE FOR GEMINI VISION ANALYSIS
            </h2>

            <div className="flex items-center justify-center border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-xl p-6 bg-[#04091a] transition-colors">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <ImageIcon className="w-8 h-8 text-cyan-400 mb-2 animate-pulse" />
                <span className="text-xs font-mono text-cyan-300">
                  CLICK TO SELECT IMAGE (PNG, JPG, WEBP)
                </span>
                <span className="text-[10px] text-slate-500 mt-1 font-mono">
                  OR DRAG & DROP FILE HERE
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {selectedImageBase64 && (
              <div className="space-y-3 pt-2">
                <div className="rounded-lg overflow-hidden border border-cyan-500/30 max-h-56 flex justify-center bg-[#02050f]">
                  <img
                    src={selectedImageBase64}
                    alt="Selected to analyze"
                    className="max-h-56 object-contain"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-cyan-400/80">INSTRUCTION PROMPT</label>
                  <input
                    type="text"
                    value={visionPrompt}
                    onChange={(e) => setVisionPrompt(e.target.value)}
                    className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleAnalyzeVision}
                  disabled={isAnalyzing}
                  className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs flex items-center justify-center space-x-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>{isAnalyzing ? 'RUNNING MULTIMODAL INFERENCE...' : 'ANALYZE IMAGE WITH AI'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Vision Output Report */}
          <div className="holo-panel rounded-xl p-4 space-y-3 flex flex-col">
            <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span className="flex items-center">
                <Sparkles className="w-4 h-4 mr-1.5 text-cyan-400" />
                VISION ANALYSIS BREAKDOWN
              </span>
              {visionAnalysis && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(visionAnalysis);
                    alert('Analysis copied to clipboard.');
                  }}
                  className="text-cyan-400 hover:text-cyan-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </h2>

            <div className="flex-1 p-3 rounded-lg bg-[#05091a] border border-cyan-500/20 text-xs font-sans text-slate-200 leading-relaxed overflow-y-auto whitespace-pre-wrap select-text">
              {visionAnalysis || (
                <div className="h-48 flex items-center justify-center text-slate-500 font-mono text-center">
                  Select an image on the left and click &quot;Analyze Image&quot; to receive a complete breakdown.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE DIAGRAMS & CHARTS */}
      {activeSubTab === 'diagrams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Diagram Editor */}
          <div className="holo-panel rounded-xl p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
                <GitBranch className="w-4 h-4 mr-1.5 text-cyan-400" />
                MERMAID DIAGRAM CODE
              </h2>
              <div className="flex items-center space-x-1">
                {[
                  {
                    type: 'flowchart',
                    label: 'Architecture',
                    code: `graph TD\n  A[STONIC AI Core] --> B[Voice Assistant]\n  A --> C[Autonomous Agent]\n  A --> D[Laptop Controls]\n  B --> E[Web Speech Engine]\n  C --> F[Playwright + SQLite]\n  D --> G[PowerShell Bridge]`,
                  },
                  {
                    type: 'mindmap',
                    label: 'Skills Matrix',
                    code: `mindmap\n  root((STONIC AI))\n    Hardware\n      Battery\n      Volume\n      Screenshots\n    AI Agent\n      Web Search\n      Doc Synthesizer\n    Visual Hub\n      Real Image Gen\n      Vision\n      Diagrams`,
                  },
                  {
                    type: 'sequence',
                    label: 'Voice Flow',
                    code: `sequenceDiagram\n  autonumber\n  User->>Jarvis: 'Hey Jarvis, Open Chrome'\n  Jarvis->>VoiceEngine: Detects Wake Word\n  VoiceEngine->>SystemControl: Execute 'start chrome'\n  SystemControl-->>Jarvis: Process Spawned\n  Jarvis-->>User: 'Google Chrome opened, Sir.'`,
                  },
                ].map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => setDiagramCode(sample.code)}
                    className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={diagramCode}
              onChange={(e) => setDiagramCode(e.target.value)}
              className="flex-1 w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg p-3 text-xs text-cyan-200 font-mono focus:outline-none min-h-[300px]"
            />

            {diagramError && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono">
                {diagramError}
              </div>
            )}
          </div>

          {/* Diagram Preview */}
          <div className="holo-panel rounded-xl p-4 space-y-3 flex flex-col">
            <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider border-b border-cyan-500/20 pb-2">
              REAL-TIME RENDERED SVG VISUALIZATION
            </h2>
            <div
              className="flex-1 bg-[#04091a] border border-cyan-500/20 rounded-lg p-4 flex items-center justify-center overflow-auto"
              dangerouslySetInnerHTML={{ __html: diagramSvg }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

