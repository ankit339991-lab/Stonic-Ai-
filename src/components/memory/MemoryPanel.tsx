import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  Download,
  Search,
  Check,
  Star,
  FileText,
  Bookmark,
  Sparkles,
} from 'lucide-react';

interface MemoryItem {
  id: number;
  category: string;
  key: string;
  value: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

export const MemoryPanel: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Memory Modal / Form
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('preference');
  const [newImportance, setNewImportance] = useState(3);
  const [isAdding, setIsAdding] = useState(false);

  const categories = [
    { id: 'all', label: 'All Memories' },
    { id: 'preference', label: 'Preferences' },
    { id: 'custom_instruction', label: 'Custom Instructions' },
    { id: 'task_insight', label: 'Task Insights' },
    { id: 'project', label: 'Projects' },
    { id: 'user_fact', label: 'User Facts' },
  ];

  const fetchMemories = async () => {
    setIsLoading(true);
    try {
      const cat = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await window.electronAPI.getMemories(cat);
      setMemories(data);
    } catch (e: any) {
      console.error('Failed to load memories', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [selectedCategory]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      await window.electronAPI.addMemory(
        newCategory,
        newKey.trim(),
        newValue.trim(),
        newImportance
      );
      setNewKey('');
      setNewValue('');
      setIsAdding(false);
      fetchMemories();
    } catch (e: any) {
      alert(`Error saving memory: ${e.message}`);
    }
  };

  const handleDeleteMemory = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this memory?')) return;
    try {
      await window.electronAPI.deleteMemory(id);
      fetchMemories();
    } catch (e: any) {
      alert(`Error deleting: ${e.message}`);
    }
  };

  const handleExportData = async () => {
    try {
      const jsonStr = await window.electronAPI.exportAllData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stonic_ai_memory_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    }
  };

  const filteredMemories = memories.filter(
    (m) =>
      m.key.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.value.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)]">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300">
              PERSONAL MEMORY MATRIX (SQLITE)
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              PERSISTENT LOCAL STORAGE FOR PREFERENCES, INSTRUCTIONS & TASK INSIGHTS
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportData}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#071330] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT JSON</span>
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold shadow-[0_0_12px_rgba(0,243,255,0.3)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'CANCEL' : 'RECORD MEMORY'}</span>
          </button>
        </div>
      </div>

      {/* Add Memory Form */}
      {isAdding && (
        <form
          onSubmit={handleAddMemory}
          className="holo-panel rounded-xl p-4 space-y-3 border border-cyan-400/50 shadow-[0_0_20px_rgba(0,243,255,0.15)] animate-fadeIn"
        >
          <div className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
            RECORD NEW MEMORY / CUSTOM INSTRUCTION
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono text-cyan-400/80">CATEGORY</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none"
              >
                <option value="preference">Preference</option>
                <option value="custom_instruction">Custom Instruction</option>
                <option value="task_insight">Task Insight</option>
                <option value="project">Project</option>
                <option value="user_fact">User Fact</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-cyan-400/80">IDENTIFIER KEY</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. favorite_browser, work_hours..."
                className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-cyan-400/80">
                IMPORTANCE LEVEL (1-5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={newImportance}
                onChange={(e) => setNewImportance(parseInt(e.target.value) || 3)}
                className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-cyan-400/80">VALUE / INSTRUCTION</label>
            <textarea
              rows={2}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Detailed rule, preference, or fact to remember..."
              className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg p-2 text-xs text-slate-100 font-sans focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs"
            >
              Commit to SQLite
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                  : 'bg-[#060c1d] border border-cyan-500/15 text-slate-400 hover:text-cyan-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-cyan-500/50" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search memories..."
            className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-cyan-500/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Memories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredMemories.length > 0 ? (
          filteredMemories.map((mem) => (
            <div
              key={mem.id}
              className="holo-panel rounded-xl p-3.5 space-y-2 relative group hover:border-cyan-400/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {mem.category}
                  </span>
                  <span className="font-orbitron font-semibold text-xs text-slate-100">
                    {mem.key}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Importance Stars */}
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: mem.importance || 1 }).map((_, i) => (
                      <Star key={i} className="w-2.5 h-2.5 fill-current" />
                    ))}
                  </div>

                  <button
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed select-text">
                {mem.value}
              </p>

              <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-cyan-500/10 flex justify-between">
                <span>ID: #{mem.id}</span>
                <span>
                  SAVED: {new Date(mem.createdAt).toLocaleDateString()}{' '}
                  {new Date(mem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 h-48 flex flex-col items-center justify-center text-slate-500 text-xs font-mono text-center">
            {isLoading ? 'Querying SQLite memory database...' : 'No memory records found in this category.'}
          </div>
        )}
      </div>
    </div>
  );
};
