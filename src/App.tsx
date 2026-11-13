import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { ChatHUD, ChatEntry } from './components/jarvis-core/ChatHUD';
import { AgentPlanner } from './components/agent/AgentPlanner';
import { LaptopDashboard } from './components/laptop-control/LaptopDashboard';
import { BrowserPanel } from './components/browser/BrowserPanel';
import { DocumentPanel } from './components/documents/DocumentPanel';
import { VisualHub } from './components/visual-hub/VisualHub';
import { MemoryPanel } from './components/memory/MemoryPanel';
import { SkillsPanel } from './components/skills/SkillsPanel';
import { TasksPanel } from './components/tasks/TasksPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('core');
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: 'welcome_1',
      role: 'model',
      content:
        'Greetings, Sir. STONIC AI (Mark-VII) is fully operational. All laptop telemetry, hardware controls, and autonomous agent systems are standing by. How may I assist you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Voice Assistant Hook
  const voice = useVoiceAssistant({
    wakeWord: 'Hey Jarvis',
    wakeWordEnabled: true,
    onCommand: (cmd) => {
      handleUserInstruction(cmd);
    },
  });

  // Emergency stop listener from Electron global shortcut or tray
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const cleanup = window.electronAPI.onEmergencyStopTriggered(() => {
      setIsEmergencyStopped(true);
      voice.stopSpeaking();
    });

    return () => {
      cleanup();
    };
  }, [voice]);

  const handleEmergencyStop = async () => {
    setIsEmergencyStopped(true);
    voice.stopSpeaking();
    await window.electronAPI?.emergencyStop();
  };

  const handleResetEmergencyStop = async () => {
    setIsEmergencyStopped(false);
    await window.electronAPI?.resetEmergencyStop();
  };

  /**
   * Intent Router: Check if prompt is a direct laptop hardware/app command,
   * or a complex conversational/research request for Gemini.
   */
  const handleUserInstruction = useCallback(
    async (text: string) => {
      if (!text.trim() || isEmergencyStopped) return;

      const userMsg: ChatEntry = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      const lower = text.toLowerCase().trim();

      try {
        // 1. Direct Laptop App Launchers
        if (lower.startsWith('open ') || lower.startsWith('launch ')) {
          const appTarget = lower.replace(/^(open|launch)\s+/, '').trim();
          const res = await window.electronAPI.openApp(appTarget);

          let reply = res.message;
          if (res.success) {
            reply = `Opening ${appTarget} for you, Sir.`;
          }

          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 2. Volume Controls
        if (lower.includes('volume') || lower.includes('mute') || lower.includes('sound')) {
          if (lower.includes('up') || lower.includes('increase') || lower.includes('louder')) {
            await window.electronAPI.adjustVolume('up', 8);
            const reply = 'Increasing volume, Sir.';
            addAssistantMessage(reply);
            await voice.speak(reply);
          } else if (lower.includes('down') || lower.includes('decrease') || lower.includes('lower')) {
            await window.electronAPI.adjustVolume('down', 8);
            const reply = 'Decreasing volume, Sir.';
            addAssistantMessage(reply);
            await voice.speak(reply);
          } else if (lower.includes('mute') || lower.includes('unmute')) {
            await window.electronAPI.adjustVolume('mute');
            const reply = 'Toggling audio mute status, Sir.';
            addAssistantMessage(reply);
            await voice.speak(reply);
          }
          setIsThinking(false);
          return;
        }

        // 3. Battery Status
        if (lower.includes('battery') || lower.includes('charge') || lower.includes('power')) {
          const battery = await window.electronAPI.getBattery();
          const reply = battery.success
            ? `Laptop battery is currently at ${battery.percent}%, and is ${battery.status}.`
            : 'Unable to query battery telemetry, Sir.';
          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 4. Storage Info
        if (lower.includes('storage') || lower.includes('hard drive') || lower.includes('disk space')) {
          const storage = await window.electronAPI.getStorage();
          const primary = storage[0];
          const reply = primary
            ? `Primary drive ${primary.drive} has ${primary.free_gb} GB free out of ${primary.total_gb} GB (${primary.percent_used}% utilized).`
            : 'No storage partition telemetry available, Sir.';
          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 5. Screenshot
        if (lower.includes('screenshot') || lower.includes('capture screen') || lower.includes('snip')) {
          const res = await window.electronAPI.takeScreenshot();
          const reply = res.success
            ? `Desktop screenshot captured successfully and saved to ${res.path}.`
            : `Failed to capture screenshot: ${res.error}`;
          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 6. Lock Laptop
        if (lower.includes('lock laptop') || lower.includes('lock screen') || lower.includes('lock my laptop')) {
          const reply = 'Locking your workstation now, Sir.';
          addAssistantMessage(reply);
          await voice.speak(reply);
          await window.electronAPI.lockLaptop();
          setIsThinking(false);
          return;
        }

        // 7. Conversational Query / General Intelligence via Gemini
        const historyForAI = messages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        historyForAI.push({ role: 'user', content: text });

        const aiResponse = await window.electronAPI.chat(historyForAI);
        addAssistantMessage(aiResponse);
        await voice.speak(aiResponse);
      } catch (err: any) {
        const errorReply = `My apologies, Sir. An anomaly occurred: ${err.message}. If you have not yet set your Gemini API key, please configure it in the Settings panel.`;
        addAssistantMessage(errorReply);
        await voice.speak('An anomaly occurred while processing your request, Sir.');
      } finally {
        setIsThinking(false);
      }
    },
    [messages, isEmergencyStopped, voice]
  );

  const addAssistantMessage = (content: string) => {
    const aiMsg: ChatEntry = {
      id: `msg_${Date.now()}`,
      role: 'model',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, aiMsg]);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#030712] text-slate-100 overflow-hidden font-sans">
      {/* TitleBar with Custom Window Controls & Emergency Stop */}
      <TitleBar
        isEmergencyStopped={isEmergencyStopped}
        onEmergencyStop={handleEmergencyStop}
        onResetEmergencyStop={handleResetEmergencyStop}
        isListening={voice.isListening}
      />

      {/* Main Workspace: Sidebar + Active Panel View */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isListening={voice.isListening}
          isMuted={voice.isMuted}
          onToggleMute={voice.toggleMute}
          isSpeaking={voice.isSpeaking}
          onStopSpeaking={voice.stopSpeaking}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'core' && (
            <ChatHUD
              messages={messages}
              onSendMessage={handleUserInstruction}
              isThinking={isThinking}
              isListening={voice.isListening}
              isSpeaking={voice.isSpeaking}
              onToggleListening={voice.isListening ? voice.stopListening : voice.startListening}
              onSpeakText={voice.speak}
              transcript={voice.transcript}
              wakeWordDetected={voice.wakeWordDetected}
            />
          )}
          {activeTab === 'agent' && <AgentPlanner />}
          {activeTab === 'laptop' && <LaptopDashboard />}
          {activeTab === 'browser' && <BrowserPanel />}
          {activeTab === 'documents' && <DocumentPanel />}
          {activeTab === 'visual' && <VisualHub />}
          {activeTab === 'memory' && <MemoryPanel />}
          {activeTab === 'skills' && <SkillsPanel />}
          {activeTab === 'tasks' && <TasksPanel />}
          {activeTab === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
};
