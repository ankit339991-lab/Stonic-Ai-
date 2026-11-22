import React, { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  Pause,
  RotateCcw,
  Square,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Laptop,
  Image,
  Database,
  Terminal,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface AgentStep {
  id: number;
  title: string;
  tool: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying' | 'cancelled';
  output?: string;
  error?: string;
  retryCount?: number;
}

interface ActiveTask {
  id: string;
  goal: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
  steps: AgentStep[];
  currentStepIndex: number;
  finalReport?: string;
}

interface AgentLog {
  taskId: string;
  stepIndex: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
}

export const AgentPlanner: React.FC = () => {
  const [goalInput, setGoalInput] = useState('');
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const sampleGoals = [
    'Find the latest AI news and create a summary document',
    'Check laptop battery and available storage, then save a status report',
    'Research quantum computing breakthroughs and save research notes',
    'Take a screenshot of the current desktop and save diagnostics',
  ];

  // Listen for live Agent events from Electron main process
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const cleanupUpdate = window.electronAPI.onTaskUpdated((task: any) => {
      setActiveTask(task);
      if (task.status === 'completed' && task.finalReport) {
        setShowReportModal(true);
      }
    });

    const cleanupLog = window.electronAPI.onAgentLog((log: AgentLog) => {
      setLogs((prev) => [log, ...prev].slice(0, 150));
    });

    return () => {
      cleanupUpdate();
      cleanupLog();
    };
  }, []);

  const handleStartTask = async (goalToRun?: string) => {
    const goal = goalToRun || goalInput.trim();
    if (!goal || isPlanning) return;

    setIsPlanning(true);
    setLogs([]);
    try {
      const task = await window.electronAPI.startAgentTask(goal);
      setActiveTask(task);
      setGoalInput('');
    } catch (e: any) {
      alert(`Agent task failed to launch: ${e.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  const handlePause = async () => {
    if (!activeTask) return;
    await window.electronAPI.pauseAgentTask(activeTask.id);
  };

  const handleResume = async () => {
    if (!activeTask) return;
    await window.electronAPI.resumeAgentTask(activeTask.id);
  };

  const handleCancel = async () => {
    if (!activeTask) return;
    await window.electronAPI.cancelAgentTask(activeTask.id);
  };

  const handleEmergencyStop = async () => {
    await window.electronAPI.emergencyStop();
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'web_search':
        return <Search className="w-4 h-4 text-cyan-400" />;
      case 'scrape_webpage':
        return <GlobeIcon className="w-4 h-4 text-blue-400" />;
      case 'system_control':
        return <Laptop className="w-4 h-4 text-emerald-400" />;
      case 'document_write':
      case 'document_read':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'generate_image':
        return <Image className="w-4 h-4 text-pink-400" />;
      case 'memory_save':
        return <Database className="w-4 h-4 text-amber-400" />;
      default:
        return <Terminal className="w-4 h-4 text-cyan-400" />;
    }
  };

  const completedStepsCount = activeTask?.steps.filter((s) => s.status === 'completed').length || 0;
  const totalSteps = activeTask?.steps.length || 0;
  const progressPercent = totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid overflow-hidden p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)]">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300">
              AUTONOMOUS AI AGENT ORCHESTRATOR
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              MULTI-STEP WORKFLOW DECOMPOSITION & SAFE LAPTOP AUTOMATION
            </p>
          </div>
        </div>

        {/* Global Emergency Stop Button */}
        <button
          onClick={handleEmergencyStop}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 text-xs font-mono transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)]"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>EMERGENCY HALT</span>
        </button>
      </div>

      {/* Goal Input Section */}
      <div className="holo-panel rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Instruct the agent (e.g. 'Find latest AI news and create a summary document')..."
            disabled={isPlanning || activeTask?.status === 'in_progress'}
            className="flex-1 bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
          />
          <button
            onClick={() => handleStartTask()}
            disabled={!goalInput.trim() || isPlanning || activeTask?.status === 'in_progress'}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono font-bold text-sm flex items-center space-x-2 shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isPlanning ? 'PLANNING...' : 'LAUNCH AGENT'}</span>
          </button>
        </div>

        {/* Preset Sample Goals */}
        <div className="flex items-center space-x-2 overflow-x-auto text-xs font-mono">
          <span className="text-cyan-500/60 shrink-0">SUGGESTED TASKS:</span>
          {sampleGoals.map((sample, i) => (
            <button
              key={i}
              onClick={() => {
                setGoalInput(sample);
                handleStartTask(sample);
              }}
              disabled={activeTask?.status === 'in_progress'}
              className="px-2.5 py-1 rounded bg-[#071128] hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-300 hover:text-cyan-200 shrink-0 transition-colors"
            >
              + {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Active Task Dashboard */}
      {activeTask && (
        <div className="holo-panel rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-cyan-400/70 uppercase tracking-wider">
                  ACTIVE MISSION:
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    activeTask.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : activeTask.status === 'in_progress'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 animate-pulse'
                      : activeTask.status === 'paused'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {activeTask.status}
                </span>
              </div>
              <h2 className="text-base font-orbitron font-semibold text-slate-100 mt-1">
                {activeTask.goal}
              </h2>
            </div>

            {/* Task Controls: Pause / Resume / Cancel */}
            <div className="flex items-center space-x-2">
              {activeTask.status === 'in_progress' && (
                <button
                  onClick={handlePause}
                  className="px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center space-x-1"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>PAUSE</span>
                </button>
              )}
              {activeTask.status === 'paused' && (
                <button
                  onClick={handleResume}
                  className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESUME</span>
                </button>
              )}
              {(activeTask.status === 'in_progress' || activeTask.status === 'paused') && (
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center space-x-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>CANCEL</span>
                </button>
              )}
              {activeTask.finalReport && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-3 py-1.5 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-mono flex items-center space-x-1 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>VIEW REPORT</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-mono text-cyan-400/80 mb-1">
              <span>
                STEP {completedStepsCount} OF {totalSteps} COMPLETED
              </span>
              <span>{progressPercent}% COMPLETE</span>
            </div>
            <div className="w-full h-2 bg-[#060c1d] rounded-full overflow-hidden border border-cyan-500/20">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_10px_#00f3ff]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Steps on Left, Live Logs on Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
        {/* Left: Decomposed Steps List */}
        <div className="holo-panel rounded-xl p-4 flex flex-col min-h-0">
          <div className="text-xs font-mono text-cyan-400/70 pb-2 border-b border-cyan-500/20 flex items-center justify-between">
            <span>TASK EXECUTION STEPS</span>
            <span>{activeTask?.steps.length || 0} SUB-TASKS</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
            {activeTask && activeTask.steps.length > 0 ? (
              activeTask.steps.map((step, index) => (
                <div
                  key={step.id || index}
                  className={`p-3 rounded-lg border transition-all ${
                    step.status === 'in_progress'
                      ? 'bg-cyan-500/10 border-cyan-400/60 shadow-[0_0_15px_rgba(0,243,255,0.15)]'
                      : step.status === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                      : step.status === 'failed'
                      ? 'bg-rose-950/20 border-rose-500/40 text-slate-200'
                      : 'bg-[#060d20] border-cyan-500/15 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-[10px] font-mono text-cyan-300 font-bold">
                        {index + 1}
                      </span>
                      {getToolIcon(step.tool)}
                      <span className="font-semibold text-sm text-slate-100">{step.title}</span>
                    </div>

                    {/* Step Status Badge */}
                    <div className="flex items-center space-x-1.5">
                      {step.status === 'completed' && (
                        <span className="flex items-center text-xs font-mono text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> DONE
                        </span>
                      )}
                      {step.status === 'in_progress' && (
                        <span className="flex items-center text-xs font-mono text-cyan-300 animate-pulse">
                          <RotateCcw className="w-3.5 h-3.5 mr-1 animate-spin" /> RUNNING
                        </span>
                      )}
                      {step.status === 'pending' && (
                        <span className="flex items-center text-xs font-mono text-slate-500">
                          <Clock className="w-3.5 h-3.5 mr-1" /> QUEUED
                        </span>
                      )}
                      {step.status === 'failed' && (
                        <span className="flex items-center text-xs font-mono text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" /> FAILED
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 font-sans ml-7">{step.description}</p>

                  {/* Output summary snippet */}
                  {step.output && (
                    <div className="mt-2 ml-7 p-2 rounded bg-[#030611] border border-cyan-500/15 text-[11px] font-mono text-cyan-300/80 max-h-24 overflow-y-auto">
                      {step.output}
                    </div>
                  )}

                  {step.error && (
                    <div className="mt-2 ml-7 p-2 rounded bg-rose-950/40 border border-rose-500/30 text-[11px] font-mono text-rose-300">
                      Error: {step.error}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono p-6 text-center">
                Awaiting task launch. Enter a goal above or click a suggestion to see real-time
                decomposition.
              </div>
            )}
          </div>
        </div>

        {/* Right: Real-time Execution Logs Stream */}
        <div className="holo-panel rounded-xl p-4 flex flex-col min-h-0">
          <div className="text-xs font-mono text-cyan-400/70 pb-2 border-b border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>LIVE AGENT TELEMETRY LOGS</span>
            </div>
            <span className="text-[10px]">{logs.length} EVENTS</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 mt-3 font-mono text-xs pr-1">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`p-1.5 rounded flex items-start space-x-2 text-[11px] leading-tight ${
                    log.level === 'error'
                      ? 'bg-rose-950/30 text-rose-300 border-l-2 border-rose-500'
                      : log.level === 'warn'
                      ? 'bg-amber-950/30 text-amber-300 border-l-2 border-amber-500'
                      : log.level === 'success'
                      ? 'bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500'
                      : 'bg-[#04091a] text-cyan-300/80 border-l-2 border-cyan-500/40'
                  }`}
                >
                  <span className="text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className="flex-1 break-words">{log.message}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono text-center">
                Telemetry log stream idle.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Final Report Modal */}
      {showReportModal && activeTask?.finalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#070e24] border border-cyan-400/50 rounded-xl shadow-[0_0_40px_rgba(0,243,255,0.3)] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-[#040817]">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="font-orbitron font-semibold text-slate-100">
                  MISSION COMPLETION REPORT
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white px-2 py-1 text-xs font-mono"
              >
                CLOSE [ESC]
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 font-sans text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
              {activeTask.finalReport}
            </div>

            <div className="p-3 border-t border-cyan-500/20 bg-[#040817] flex justify-end space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeTask.finalReport || '');
                  alert('Report copied to clipboard.');
                }}
                className="px-4 py-2 rounded bg-[#0b1736] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors"
              >
                COPY REPORT
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs transition-colors"
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function GlobeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

