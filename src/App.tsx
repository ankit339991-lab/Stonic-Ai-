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
        // 1. YouTube Direct Video / Song Playback
        // Matches: "play kesariya on youtube", "youtube pe kesariya chalao", "play song shape of you", "youtube par arijit singh ke gaane lagao"
        const isYouTubePlay =
          (lower.includes('youtube') && (lower.includes('play') || lower.includes('chalao') || lower.includes('lagao') || lower.includes('sunao') || lower.includes('bajao') || lower.includes('video'))) ||
          (lower.startsWith('play ') && !lower.includes('game'));

        if (isYouTubePlay) {
          let ytQuery = text
            .replace(/^(play\s+song|play\s+video|play|chalao|lagao|sunao|bajao)\s+/i, '')
            .replace(/\s+(on\s+youtube|youtube\s+pe|youtube\s+par|in\s+youtube)$/i, '')
            .replace(/^(youtube\s+pe|youtube\s+par|youtube\s+me|youtube)\s+/i, '')
            .replace(/\s+(chalao|play\s+karo|lagao|sunao|bajao|kholo|play)$/i, '')
            .trim();

          if (!ytQuery) ytQuery = 'trending songs';

          const res = await window.electronAPI.playYouTube(ytQuery);
          addAssistantMessage(res.message);
          await voice.speak(res.message);
          setIsThinking(false);
          return;
        }

        // 2. WhatsApp Direct Message Automation
        // Matches: "whatsapp pe 9876543210 ko hello bhejo", "whatsapp pe papa ko mai ghar aa raha hu bhejo", "send hello to rahul on whatsapp"
        const isWhatsApp =
          lower.includes('whatsapp') || lower.includes('व्हाट्सएप');

        if (isWhatsApp && (lower.includes('bhejo') || lower.includes('send') || lower.includes('message') || lower.includes('msg') || lower.includes('likho') || lower.includes('ko'))) {
          // Extract recipient and message
          let recipient = '';
          let messageBody = '';

          // Pattern: "whatsapp pe [recipient] ko [message] bhejo"
          const matchKo = text.match(/(?:whatsapp\s+(?:pe|par|me)?\s*)?(.+?)\s+ko\s+(.+?)(?:\s+(?:bhejo|send\s+karo|likho))?$/i);
          // Pattern: "send [message] to [recipient] on whatsapp"
          const matchSendTo = text.match(/send\s+(.+?)\s+to\s+(.+?)(?:\s+on\s+whatsapp)?$/i);

          if (matchKo && matchKo[1] && matchKo[2]) {
            recipient = matchKo[1].replace(/^(whatsapp\s+(?:pe|par|me)?\s*)/i, '').trim();
            messageBody = matchKo[2].replace(/\s+(?:bhejo|send\s+karo)$/i, '').trim();
          } else if (matchSendTo && matchSendTo[1] && matchSendTo[2]) {
            messageBody = matchSendTo[1].trim();
            recipient = matchSendTo[2].trim();
          } else {
            // General fallback: anything after "whatsapp"
            recipient = 'Friend';
            messageBody = text.replace(/^(whatsapp\s+(?:pe|par|me)?\s*(?:message\s*)?(?:bhejo|send)?)/i, '').trim() || 'Hello';
          }

          const res = await window.electronAPI.sendWhatsApp(recipient, messageBody);
          addAssistantMessage(res.message);
          await voice.speak(res.message);
          setIsThinking(false);
          return;
        }

        // 3. Google Chrome Direct Search
        // Matches: "google pe ai news search karo", "search weather in delhi on google", "google search latest tech news", "chrome me cricket score search karo"
        const isGoogleSearch =
          (lower.includes('google') && (lower.includes('search') || lower.includes('dhoondho') || lower.includes('pe') || lower.includes('par'))) ||
          (lower.startsWith('search ') && (lower.includes('google') || lower.includes('web')));

        if (isGoogleSearch) {
          const gQuery = text
            .replace(/^(google\s*search\s*|search\s+on\s+google\s+for\s*|search\s+google\s+for\s*|search\s*)/i, '')
            .replace(/^(google\s*(?:pe|par|me)?\s*)/i, '')
            .replace(/\s+(search\s*karo|dhoondho|karo|batao)$/i, '')
            .trim();

          const res = await window.electronAPI.searchGoogle(gQuery || 'Google');
          addAssistantMessage(res.message);
          await voice.speak(res.message);
          setIsThinking(false);
          return;
        }

        // 4. Open ANY Installed Application on Laptop
        // Matches: "open capcut", "cursor kholo", "vlc player open karo", "brave kholo", "open notepad", "word open karo", "calculator kholo"
        const isAppLaunch =
          lower.startsWith('open ') ||
          lower.startsWith('launch ') ||
          lower.startsWith('start ') ||
          lower.includes('kholo') ||
          lower.includes('खोलो') ||
          lower.includes('open karo') ||
          lower.includes('ओपन करो') ||
          lower.includes('chalu karo') ||
          lower.includes('चालू करो') ||
          lower.includes('chalao') ||
          lower.includes('चलाओ');

        if (isAppLaunch) {
          const appTarget = text
            .replace(/^(open|launch|start|chalu\s+karo)\s+/i, '')
            .replace(/\s+(kholo|खोलो|open\s+karo|ओपन\s+करो|chalu\s+karo|चालू\s+करो|chalao|चलाओ|karo|करो)$/i, '')
            .replace(/^(कृपया|please)\s+/i, '')
            .trim();

          const res = await window.electronAPI.openApp(appTarget);
          let reply = res.success
            ? (res.matchedApp ? `'${res.matchedApp}' आपके लिए ओपन कर दिया है, सर।` : res.message)
            : res.message;

          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 2. Volume Controls (English & Hindi: "आवाज़ बढ़ाओ", "वॉल्यूम कम करो", "म्यूट करो")
        if (
          lower.includes('volume') ||
          lower.includes('mute') ||
          lower.includes('sound') ||
          lower.includes('awaz') ||
          lower.includes('aawaz') ||
          lower.includes('आवाज़') ||
          lower.includes('वॉल्यूम') ||
          lower.includes('म्यूट')
        ) {
          if (
            lower.includes('up') ||
            lower.includes('increase') ||
            lower.includes('louder') ||
            lower.includes('badhao') ||
            lower.includes('बढ़ाओ') ||
            lower.includes('tez')
          ) {
            await window.electronAPI.adjustVolume('up', 8);
            const reply = 'आवाज़ बढ़ा दी गई है, सर।';
            addAssistantMessage(reply);
            await voice.speak(reply);
          } else if (
            lower.includes('down') ||
            lower.includes('decrease') ||
            lower.includes('lower') ||
            lower.includes('kam') ||
            lower.includes('कम') ||
            lower.includes('dheemi')
          ) {
            await window.electronAPI.adjustVolume('down', 8);
            const reply = 'आवाज़ कम कर दी गई है, सर।';
            addAssistantMessage(reply);
            await voice.speak(reply);
          } else if (
            lower.includes('mute') ||
            lower.includes('unmute') ||
            lower.includes('म्यूट') ||
            lower.includes('chup') ||
            lower.includes('band') ||
            lower.includes('बंद')
          ) {
            await window.electronAPI.adjustVolume('mute');
            const reply = 'ऑडियो म्यूट / अनम्यूट टॉगल कर दिया गया है, सर।';
            addAssistantMessage(reply);
            await voice.speak(reply);
          }
          setIsThinking(false);
          return;
        }

        // 3. Battery Status (English & Hindi: "बैटरी कितनी है", "चार्जिंग चेक करो")
        if (
          lower.includes('battery') ||
          lower.includes('charge') ||
          lower.includes('power') ||
          lower.includes('बैटरी') ||
          lower.includes('चार्ज')
        ) {
          const battery = await window.electronAPI.getBattery();
          const reply = battery.success
            ? `लैपटॉप की बैटरी अभी ${battery.percent}% है और ${battery.status === 'Charging' ? 'चार्ज हो रही है' : 'बैटरी पावर पर चल रही है'}, सर।`
            : 'बैटरी टेलीमेट्री प्राप्त नहीं हो सकी, सर।';
          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 4. Storage Info (English & Hindi: "स्टोरेज दिखाओ", "स्पेस कितना है")
        if (
          lower.includes('storage') ||
          lower.includes('hard drive') ||
          lower.includes('disk') ||
          lower.includes('स्टोरेज') ||
          lower.includes('मेमोरी') ||
          lower.includes('space') ||
          lower.includes('स्पेस')
        ) {
          const storage = await window.electronAPI.getStorage();
          const primary = storage[0];
          const reply = primary
            ? `प्राइमरी ड्राइव ${primary.drive} में ${primary.free_gb} GB स्पेस खाली है (कुल ${primary.total_gb} GB में से), सर।`
            : 'स्टोरेज पार्टीशन की जानकारी उपलब्ध नहीं है, सर।';
          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 5. Screenshot (English & Hindi: "स्क्रीनशॉट लो", "फोटो खींचो")
        if (
          lower.includes('screenshot') ||
          lower.includes('capture') ||
          lower.includes('snip') ||
          lower.includes('स्क्रीनशॉट') ||
          lower.includes('स्क्रीन शॉट')
        ) {
          const res = await window.electronAPI.takeScreenshot();
          const reply = res.success
            ? `डेस्कटॉप का स्क्रीनशॉट ले लिया गया है और सुरक्षित सेव कर दिया है, सर।`
            : `स्क्रीनशॉट लेने में त्रुटि आई: ${res.error}`;
          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 6. Lock Laptop (English & Hindi: "लैपटॉप लॉक करो", "स्क्रीन लॉक करो")
        if (
          lower.includes('lock') ||
          lower.includes('लॉक') ||
          lower.includes('workstation')
        ) {
          const reply = 'आपका वर्कस्टेशन तुरंत लॉक किया जा रहा है, सर।';
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

