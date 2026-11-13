import React, { useState } from 'react';
import {
  FileText,
  Upload,
  BookOpen,
  FolderSync,
  Plus,
  Table,
  Check,
  AlertTriangle,
  Folder,
  FileCode,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface ParsedDoc {
  fileName: string;
  filePath: string;
  fileType: string;
  sizeBytes: number;
  text: string;
  tableData?: any[];
  metadata?: any;
}

export const DocumentPanel: React.FC = () => {
  const [filePathInput, setFilePathInput] = useState('');
  const [activeDoc, setActiveDoc] = useState<ParsedDoc | null>(null);
  const [docSummary, setDocSummary] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // New Document Creator State
  const [newDocName, setNewDocName] = useState('STONIC_Note.md');
  const [newDocContent, setNewDocContent] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  // Folder Organizer State
  const [folderToOrganize, setFolderToOrganize] = useState('');
  const [organizePlan, setOrganizePlan] = useState<any[] | null>(null);
  const [showOrganizeConfirm, setShowOrganizeConfirm] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const handleReadDocument = async () => {
    if (!filePathInput.trim() || isReading) return;
    setIsReading(true);
    setDocSummary(null);

    try {
      const doc = await window.electronAPI.readDocument(filePathInput.trim());
      setActiveDoc(doc);
      setFeedback(`Parsed ${doc.fileName} (${doc.fileType})`);
    } catch (e: any) {
      alert(`Error reading document: ${e.message}`);
    } finally {
      setIsReading(false);
    }
  };

  const handleSummarize = async () => {
    if (!activeDoc || isSummarizing) return;
    setIsSummarizing(true);

    try {
      const prompt = `
Analyze and summarize the following document:
File: ${activeDoc.fileName} (${activeDoc.fileType})
Text Content:
${activeDoc.text.slice(0, 8000)}

Provide:
1. Executive Summary (3-5 key takeaways)
2. Detailed Key Topics
3. Actionable Items or Recommendations
      `.trim();

      const summary = await window.electronAPI.chat([{ role: 'user', content: prompt }]);
      setDocSummary(summary);
    } catch (e: any) {
      alert(`Summarization error: ${e.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocName.trim() || !newDocContent.trim() || isCreatingDoc) return;
    setIsCreatingDoc(true);

    try {
      const defaultPath = `C:\\Users\\Dell\\Desktop\\${newDocName.trim()}`;
      const res = await window.electronAPI.createDocument(defaultPath, newDocContent);
      if (res.success) {
        setFeedback(`Document created successfully at ${res.filePath}`);
        setNewDocContent('');
      }
    } catch (e: any) {
      alert(`Create document error: ${e.message}`);
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handlePreviewOrganize = async () => {
    if (!folderToOrganize.trim()) return;
    try {
      const plan = await window.electronAPI.organizeFolderPreview(folderToOrganize.trim());
      setOrganizePlan(plan);
      if (plan.length === 0) {
        alert('No files found to organize in the target folder.');
      } else {
        setShowOrganizeConfirm(true);
      }
    } catch (e: any) {
      alert(`Organize error: ${e.message}`);
    }
  };

  const handleExecuteOrganize = async () => {
    setShowOrganizeConfirm(false);
    if (!organizePlan || organizePlan.length === 0) return;

    try {
      const res = await window.electronAPI.executeOrganization(organizePlan);
      setFeedback(`Successfully organized ${res.movedCount} files.`);
      setOrganizePlan(null);
    } catch (e: any) {
      alert(`Execute organize error: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] cyber-grid overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-orbitron font-bold text-cyan-300">
              FILES & DOCUMENT INTELLIGENCE
            </h1>
            <p className="text-xs font-mono text-cyan-400/60">
              PDF, WORD (.DOCX), EXCEL (.XLSX), TEXT PARSER & AI SUMMARIZATION
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-cyan-950/60 border border-cyan-400/50 text-cyan-200 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-cyan-400" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Document Reader / Loader Form */}
      <div className="holo-panel rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
          <BookOpen className="w-4 h-4 mr-1.5 text-cyan-400" />
          READ DOCUMENT (PDF, WORD, EXCEL, TEXT)
        </h2>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={filePathInput}
            onChange={(e) => setFilePathInput(e.target.value)}
            placeholder="Enter full file path (e.g. C:\Users\Dell\Documents\sample.pdf or sample.docx)..."
            className="flex-1 bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-4 py-2 text-xs text-slate-100 placeholder-cyan-500/40 focus:outline-none"
          />
          <button
            onClick={handleReadDocument}
            disabled={!filePathInput.trim() || isReading}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-mono font-bold flex items-center space-x-1.5"
          >
            <span>{isReading ? 'ANALYZING...' : 'PARSE DOCUMENT'}</span>
          </button>
        </div>
      </div>

      {/* Active Document Analysis & Summarization View */}
      {activeDoc && (
        <div className="holo-panel rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-100">{activeDoc.fileName}</h3>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                  {activeDoc.fileType}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {Math.round(activeDoc.sizeBytes / 1024)} KB
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">{activeDoc.filePath}</p>
            </div>

            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="px-4 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-mono font-bold text-xs flex items-center space-x-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isSummarizing ? 'SUMMARIZING...' : 'AI SUMMARIZE'}</span>
            </button>
          </div>

          {/* AI Summary View */}
          {docSummary && (
            <div className="p-4 rounded-lg bg-[#070e24] border border-purple-500/40 text-xs font-sans text-slate-200 leading-relaxed whitespace-pre-wrap select-text space-y-2">
              <h4 className="text-xs font-mono text-purple-300 font-bold uppercase tracking-wider">
                EXECUTIVE SUMMARY & INSIGHTS:
              </h4>
              <div>{docSummary}</div>
            </div>
          )}

          {/* Spreadsheet Table View if Excel */}
          {activeDoc.tableData && activeDoc.tableData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono text-cyan-400 flex items-center">
                <Table className="w-3.5 h-3.5 mr-1" /> SPREADSHEET PREVIEW (
                {activeDoc.tableData[0]?.sheet}):
              </h4>
              <div className="max-h-60 overflow-x-auto overflow-y-auto border border-cyan-500/20 rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <tbody className="divide-y divide-cyan-500/10">
                    {activeDoc.tableData[0]?.rows?.slice(0, 15).map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-cyan-500/5">
                        {Object.values(row).map((val: any, j: number) => (
                          <td key={j} className="p-2 border-r border-cyan-500/10 text-slate-300">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Extracted Text Body */}
          <div className="space-y-1">
            <h4 className="text-xs font-mono text-cyan-400/80">EXTRACTED CONTENT:</h4>
            <div className="p-3 rounded-lg bg-[#05091a] border border-cyan-500/20 max-h-64 overflow-y-auto text-xs font-mono text-slate-300 whitespace-pre-wrap select-text">
              {activeDoc.text || 'No text extracted.'}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Grid: Create Document & Folder Organizer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Create New Document Form */}
        <div className="holo-panel rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
            <Plus className="w-4 h-4 mr-1.5 text-cyan-400" />
            CREATE NEW DOCUMENT / NOTES
          </h2>
          <input
            type="text"
            value={newDocName}
            onChange={(e) => setNewDocName(e.target.value)}
            placeholder="Document filename (e.g. AI_Strategy.md)..."
            className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-cyan-500/40 focus:outline-none"
          />
          <textarea
            rows={4}
            value={newDocContent}
            onChange={(e) => setNewDocContent(e.target.value)}
            placeholder="Type or paste markdown content to save..."
            className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg p-3 text-xs text-slate-100 placeholder-cyan-500/40 focus:outline-none font-sans"
          />
          <button
            onClick={handleCreateDocument}
            disabled={!newDocContent.trim() || isCreatingDoc}
            className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-mono font-bold flex items-center justify-center space-x-1.5"
          >
            <span>{isCreatingDoc ? 'WRITING FILE...' : 'SAVE DOCUMENT TO DESKTOP'}</span>
          </button>
        </div>

        {/* Folder Organizer with Safety Prompt */}
        <div className="holo-panel rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center">
            <FolderSync className="w-4 h-4 mr-1.5 text-cyan-400" />
            SMART FOLDER ORGANIZER
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            Categorizes scattered files into Documents, Images, Videos, Audio, and Code. Requires
            explicit confirmation before any file move.
          </p>
          <input
            type="text"
            value={folderToOrganize}
            onChange={(e) => setFolderToOrganize(e.target.value)}
            placeholder="Folder to organize (e.g. C:\Users\Dell\Downloads)..."
            className="w-full bg-[#060e22] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-cyan-500/40 focus:outline-none"
          />
          <button
            onClick={handlePreviewOrganize}
            disabled={!folderToOrganize.trim()}
            className="w-full py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-center space-x-1.5 transition-colors"
          >
            <span>PREVIEW ORGANIZATION PLAN</span>
          </button>
        </div>
      </div>

      {/* Folder Organization Confirmation Modal */}
      <ConfirmModal
        isOpen={showOrganizeConfirm}
        title="Confirm Folder Organization"
        message={`STONIC AI proposed moving ${organizePlan?.length || 0} file(s) into categorized subfolders (Documents, Images, etc.) in "${folderToOrganize}". Do you approve this operation?`}
        confirmLabel="Approve & Organize"
        isDangerous={false}
        onConfirm={handleExecuteOrganize}
        onCancel={() => setShowOrganizeConfirm(false)}
      />
    </div>
  );
};
