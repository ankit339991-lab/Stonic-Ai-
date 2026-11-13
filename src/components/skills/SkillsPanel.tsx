import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Globe,
  Laptop,
  FolderTree,
  FileText,
  Code,
  Briefcase,
  GraduationCap,
  Video,
  MessageCircle,
  Image,
  ShieldCheck,
  ShieldAlert,
  Check,
} from 'lucide-react';

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  description: string;
  capabilities: string[];
  requiresConfirmation: boolean;
  enabled: boolean;
}

export const SkillsPanel: React.FC = () => {
  const [skills, setSkills] = useState<SkillDefinition[]>([
    {
      id: 'browserResearch',
      name: 'Browser Research',
      category: 'Research & Web',
      icon: Globe,
      description: 'Performs live web queries, reads articles, extracts source citations, and browses documentation.',
      capabilities: ['Google/DuckDuckGo Search', 'Headless Web Scraping', 'Source Extraction'],
      requiresConfirmation: false,
      enabled: true,
    },
    {
      id: 'laptopControl',
      name: 'Laptop Control',
      category: 'Hardware & OS',
      icon: Laptop,
      description: 'Controls Windows audio volume, battery telemetry, workstation lock, screenshots, and allowlisted apps.',
      capabilities: ['Volume Adjustment', 'Screenshots', 'Lock Workstation', 'Hardware Gauges'],
      requiresConfirmation: true,
      enabled: true,
    },
    {
      id: 'fileManagement',
      name: 'File Management',
      category: 'System Storage',
      icon: FolderTree,
      description: 'Searches local files, creates directories, renames files, and safely organizes cluttered folders.',
      capabilities: ['Directory Search', 'Folder Organization', 'File Operations'],
      requiresConfirmation: true,
      enabled: true,
    },
    {
      id: 'documentAssistant',
      name: 'Document Assistant',
      category: 'Productivity',
      icon: FileText,
      description: 'Parses PDF, Word (.docx), Excel (.xlsx), and text files to generate instant AI executive summaries.',
      capabilities: ['PDF Text Extraction', 'Excel Spreadsheets', 'AI Summaries'],
      requiresConfirmation: false,
      enabled: true,
    },
    {
      id: 'codingAssistant',
      name: 'Coding Assistant',
      category: 'Development',
      icon: Code,
      description: 'Writes, inspects, and debugs Python, JavaScript, TypeScript, PowerShell, and SQL code.',
      capabilities: ['Code Synthesis', 'Bug Diagnostics', 'Script Generation'],
      requiresConfirmation: false,
      enabled: true,
    },
    {
      id: 'businessResearch',
      name: 'Business Research',
      category: 'Intelligence',
      icon: Briefcase,
      description: 'Compiles market reports, competitive analysis, company profiles, and structured executive briefs.',
      capabilities: ['Market Intelligence', 'Competitive Matrix', 'Executive Briefs'],
      requiresConfirmation: false,
      enabled: true,
    },
    {
      id: 'studyAssistant',
      name: 'Study Assistant',
      category: 'Education',
      icon: GraduationCap,
      description: 'Transforms dense academic papers and articles into flashcards, quizzes, and structured revision guides.',
      capabilities: ['Conceptual Explanations', 'Flashcard Generation', 'Study Guides'],
      requiresConfirmation: false,
      enabled: true,
    },
    {
      id: 'youtubeAssistant',
      name: 'YouTube Assistant',
      category: 'Media',
      icon: Video,
      description: 'Finds educational video topics, launches YouTube desktop/web, and summarizes video concepts.',
      capabilities: ['Video Search', 'Concept Extraction', 'Topic Navigation'],
      requiresConfirmation: false,
      enabled: true,
    },
    {
      id: 'communicationAssistant',
      name: 'Communication Assistant',
      category: 'Productivity',
      icon: MessageCircle,
      description: 'Drafts articulate emails, team updates, and messages. Never sends autonomously without review.',
      capabilities: ['Draft Email Synthesis', 'Professional Polish', 'WhatsApp Desktop Helper'],
      requiresConfirmation: true,
      enabled: true,
    },
    {
      id: 'imageGeneration',
      name: 'Image Generation',
      category: 'Creative Hub',
      icon: Image,
      description: 'Creates real high-resolution visuals, diagrams, and illustrations via high-tier AI generation models.',
      capabilities: ['1024x1024 AI Art', 'Visual Diagrams', 'Disk Storage'],
      requiresConfirmation: false,
      enabled: true,
    },
  ]);

  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Load skills permissions from settings if available
    const loadPermissions = async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        if (settings.skillsPermissions) {
          setSkills((prev) =>
            prev.map((s) => ({
              ...s,
              enabled: settings.skillsPermissions[s.id] ?? s.enabled,
            }))
          );
        }
      } catch (e) {
        console.error('Failed to load skill settings', e);
      }
    };
    loadPermissions();
  }, []);

  const toggleSkill = async (id: string) => {
    const updated = skills.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSkills(updated);

    const permissionsMap = updated.reduce((acc, curr) => {
      acc[curr.id] = curr.enabled;
      return acc;
    }, {} as Record<string, boolean>);

    try {
      await window.electronAPI.updateSettings({ skillsPermissions: permissionsMap });
      const targetSkill = updated.find((s) => s.id === id);
      setFeedback(
        `${targetSkill?.name} is now ${targetSkill?.enabled ? 'ACTIVATED' : 'DISABLED'}.`
      );
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      console.error('Failed to update skill permission', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300">
              JARVIS SKILLS & CAPABILITY MATRIX
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              MODULAR SUBSYSTEMS, GRANULAR PERMISSIONS & SAFE EXECUTION POLICIES
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-cyan-400">
          ACTIVE SKILLS:{' '}
          <span className="font-bold text-white">
            {skills.filter((s) => s.enabled).length} / {skills.length}
          </span>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-cyan-950/60 border border-cyan-400/50 text-cyan-200 text-xs font-mono flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill) => {
          const Icon = skill.icon;
          return (
            <div
              key={skill.id}
              className={`holo-panel rounded-xl p-4 space-y-3 transition-all relative ${
                skill.enabled ? 'border-cyan-500/30' : 'opacity-60 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg border ${
                      skill.enabled
                        ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-orbitron font-semibold text-sm text-slate-100">
                      {skill.name}
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-400/60 uppercase">
                      {skill.category}
                    </span>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => toggleSkill(skill.id)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    skill.enabled
                      ? 'bg-cyan-500 shadow-[0_0_10px_rgba(0,243,255,0.4)]'
                      : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      skill.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {skill.description}
              </p>

              {/* Capabilities Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skill.capabilities.map((cap, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#040816] text-cyan-300/80 border border-cyan-500/20"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              {/* Security Policy Badge */}
              <div className="pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">SECURITY PROTOCOL:</span>
                {skill.requiresConfirmation ? (
                  <span className="flex items-center text-amber-400">
                    <ShieldAlert className="w-3 h-3 mr-1" /> EXPLICIT CONFIRMATION MANDATORY
                  </span>
                ) : (
                  <span className="flex items-center text-emerald-400">
                    <ShieldCheck className="w-3 h-3 mr-1" /> SAFE AUTONOMOUS EXECUTION
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
