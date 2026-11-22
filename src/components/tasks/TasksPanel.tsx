import React, { useState, useEffect } from 'react';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  goal: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'paused';
  stepsJson: string;
  resultSummary?: string;
  createdAt: string;
  completedAt?: string;
}

interface LogEntry {
  id?: number;
  taskId: string;
  stepIndex: number;
  level: string;
  message: string;
  timestamp: string;
}

export const TasksPanel: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await window.electronAPI.getTasks(30);
      setTasks(data);
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSelectTask = async (taskId: string) => {
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
      setSelectedLogs([]);
      return;
    }

    setSelectedTaskId(taskId);
    try {
      const logs = await window.electronAPI.getTaskLogs(taskId);
      setSelectedLogs(logs);
    } catch (e) {
      console.error('Failed to load logs', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)]">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300">
              TASK MANAGER & MISSION HISTORY
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              AUDIT TRAILS, REAL-TIME STATUS LOGS & EXECUTION REPORTS
            </p>
          </div>
        </div>

        <button
          onClick={fetchTasks}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#071330] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>REFRESH LOGS</span>
        </button>
      </div>

      {/* Task List Table */}
      <div className="holo-panel rounded-xl overflow-hidden border border-cyan-500/20">
        <div className="p-3 bg-[#050b1c] border-b border-cyan-500/20 flex justify-between items-center text-xs font-mono text-cyan-400">
          <span>TASK HISTORY RECORD</span>
          <span>{tasks.length} RECORDED TASKS</span>
        </div>

        <div className="divide-y divide-cyan-500/10">
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const isExpanded = selectedTaskId === task.id;
              let stepsCount = 0;
              try {
                stepsCount = JSON.parse(task.stepsJson)?.length || 0;
              } catch {}

              return (
                <div key={task.id} className="transition-colors">
                  <div
                    onClick={() => handleSelectTask(task.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-cyan-500/5"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-1.5 rounded-lg border ${
                          task.status === 'completed'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : task.status === 'in_progress'
                            ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-400 animate-pulse'
                            : task.status === 'failed'
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                            : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        }`}
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : task.status === 'in_progress' ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <h3 className="font-semibold text-sm text-slate-100">{task.goal}</h3>
                        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400 mt-0.5">
                          <span>ID: {task.id}</span>
                          <span>•</span>
                          <span>{stepsCount} Steps</span>
                          <span>•</span>
                          <span>{new Date(task.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          task.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : task.status === 'in_progress'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                            : task.status === 'failed'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {task.status}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Task Details & Logs */}
                  {isExpanded && (
                    <div className="p-4 bg-[#040816] border-t border-cyan-500/15 space-y-3 animate-fadeIn">
                      {task.resultSummary && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-mono text-purple-300 flex items-center">
                            <FileText className="w-3.5 h-3.5 mr-1" /> FINAL EXECUTIVE REPORT:
                          </h4>
                          <div className="p-3 rounded-lg bg-[#060d22] border border-purple-500/30 text-xs font-sans text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-56 overflow-y-auto">
                            {task.resultSummary}
                          </div>
                        </div>
                      )}

                      {/* Execution Logs */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-mono text-cyan-400 flex items-center">
                          <Terminal className="w-3.5 h-3.5 mr-1" /> EXECUTION TELEMETRY LOGS (
                          {selectedLogs.length} Events):
                        </h4>
                        <div className="p-2 rounded-lg bg-[#02050f] border border-cyan-500/20 max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
                          {selectedLogs.length > 0 ? (
                            selectedLogs.map((log, idx) => (
                              <div
                                key={idx}
                                className={`p-1 rounded flex items-start space-x-2 ${
                                  log.level === 'error'
                                    ? 'text-rose-300 bg-rose-950/20'
                                    : log.level === 'warn'
                                    ? 'text-amber-300 bg-amber-950/20'
                                    : log.level === 'success'
                                    ? 'text-emerald-300 bg-emerald-950/20'
                                    : 'text-cyan-300/80'
                                }`}
                              >
                                <span className="text-slate-500 shrink-0">
                                  {new Date(log.timestamp).toLocaleTimeString([], {
                                    hour12: false,
                                  })}
                                </span>
                                <span className="text-cyan-500 font-bold shrink-0">
                                  [Step {log.stepIndex}]
                                </span>
                                <span className="flex-1 break-words">{log.message}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-500 p-2">No logs captured.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs font-mono text-center">
              {isLoading ? 'Loading task records...' : 'No historical tasks found in database.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

