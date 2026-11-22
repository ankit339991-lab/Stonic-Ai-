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
        // 0. STOP SPEAKING / STOP AUTOMATION (INSTANT VOICE INTERRUPT)
        if (
          lower === 'stop speaking' ||
          lower === 'stop voice' ||
          lower === 'shut up' ||
          lower.includes('bolna band') ||
          lower.includes('chup ho jao') ||
          lower.includes('chup raho')
        ) {
          voice.stopSpeaking();
          const reply = 'Speech stopped, Sir.';
          addAssistantMessage(reply);
          setIsThinking(false);
          return;
        }

        if (
          lower.includes('stop browser') ||
          lower.includes('stop automation') ||
          lower.includes('browser band karo') ||
          lower.includes('automation roko')
        ) {
          await window.electronAPI.stopBrowserAutomation();
          voice.stopSpeaking();
          const reply = 'Visible browser automation halted, Sir.';
          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 1. VISIBLE BROWSER AUTOMATION: CHATGPT
        // Matches: "hey jarvis, open chatgpt", "open chatgpt", "chatgpt kholo", "ask chatgpt [question]"
        if (lower.includes('chatgpt') || lower.includes('chat gpt')) {
          if (
            lower.startsWith('ask chatgpt') ||
            lower.startsWith('ask chat gpt') ||
            lower.includes('se poocho') ||
            lower.includes('se pucho') ||
            lower.includes('par poocho') ||
            (lower.includes('chatgpt') && (lower.includes('about') || lower.includes('what is') || lower.includes('tell me') || lower.includes('kya hai')))
          ) {
            let question = text
              .replace(/^(hey jarvis|jarvis|stonic)?\s*(ask\s+chatgpt|ask\s+chat\s+gpt)\s*(about|to|for|:)?\s*/i, '')
              .replace(/^(chatgpt\s*se\s*poocho|chatgpt\s*se\s*pucho|chatgpt\s*par\s*search\s*karo)\s*/i, '')
              .trim();

            if (!question) question = text;

            addAssistantMessage(`Opening visible Chrome and submitting prompt to ChatGPT: "${question}"...`);
            await voice.speak('Asking ChatGPT now, Sir...');

            const res = await window.electronAPI.askChatGPT(question);
            if (res.success && res.answer) {
              addAssistantMessage(`### ChatGPT Response:\n\n${res.answer}`);
              await voice.speak(res.answer);
            } else {
              addAssistantMessage(res.message);
              await voice.speak(res.message);
            }
            setIsThinking(false);
            return;
          }

          if (lower.includes('open') || lower.includes('kholo') || lower.includes('launch') || lower.includes('chalu')) {
            await window.electronAPI.visibleBrowserOpen('chatgpt');
            const reply = 'ChatGPT has been opened in visible Google Chrome, Sir.';
            addAssistantMessage(reply);
            await voice.speak(reply);
            setIsThinking(false);
            return;
          }
        }

        // 2. VISIBLE BROWSER AUTOMATION: GEMINI
        // Matches: "open gemini", "gemini kholo", "ask gemini [question]", "gemini se poocho [question]"
        if (lower.includes('gemini') && !lower.includes('api key')) {
          if (
            lower.startsWith('ask gemini') ||
            lower.includes('se poocho') ||
            lower.includes('se pucho') ||
            lower.includes('par poocho') ||
            (lower.includes('gemini') && (lower.includes('about') || lower.includes('what is') || lower.includes('tell me') || lower.includes('kya hai')))
          ) {
            let question = text
              .replace(/^(hey jarvis|jarvis|stonic)?\s*(ask\s+gemini)\s*(about|to|for|:)?\s*/i, '')
              .replace(/^(gemini\s*se\s*poocho|gemini\s*se\s*pucho|gemini\s*par\s*search\s*karo)\s*/i, '')
              .trim();

            if (!question) question = text;

            addAssistantMessage(`Opening visible Chrome and submitting prompt to Google Gemini: "${question}"...`);
            await voice.speak('Asking Gemini now, Sir...');

            const res = await window.electronAPI.askGemini(question);
            if (res.success && res.answer) {
              addAssistantMessage(`### Google Gemini Response:\n\n${res.answer}`);
              await voice.speak(res.answer);
            } else {
              addAssistantMessage(res.message);
              await voice.speak(res.message);
            }
            setIsThinking(false);
            return;
          }

          if (lower.includes('open') || lower.includes('kholo') || lower.includes('launch') || lower.includes('chalu')) {
            await window.electronAPI.visibleBrowserOpen('gemini');
            const reply = 'Google Gemini has been opened in visible Google Chrome, Sir.';
            addAssistantMessage(reply);
            await voice.speak(reply);
            setIsThinking(false);
            return;
          }
        }

        // 3. VISIBLE YOUTUBE AUTOMATION (Play, Pause, Resume, Stop)
        if (lower.includes('youtube')) {
          if (lower.includes('pause') || lower.includes('roko') || lower.includes('rok do')) {
            const res = await window.electronAPI.visibleBrowserControlYouTube('pause');
            addAssistantMessage(res.message);
            await voice.speak('YouTube video paused, Sir.');
            setIsThinking(false);
            return;
          }
          if (lower.includes('resume') || lower.includes('resume video') || (lower.includes('chalao') && lower.includes('video'))) {
            const res = await window.electronAPI.visibleBrowserControlYouTube('resume');
            addAssistantMessage(res.message);
            await voice.speak('YouTube video resumed, Sir.');
            setIsThinking(false);
            return;
          }
          if (lower.includes('search') || lower.includes('play') || lower.includes('gaana') || lower.includes('song')) {
            let ytQuery = text
              .replace(/^(search\s+youtube\s+for|search\s+on\s+youtube\s+for|play\s+on\s+youtube|play\s+youtube|play\s+song|play)\s*/i, '')
              .replace(/\s+(and\s+play\s+it|on\s+youtube|youtube\s+pe|youtube\s+par)$/i, '')
              .replace(/^(youtube\s+pe|youtube\s+par|youtube\s+me)\s*/i, '')
              .replace(/\s+(chalao|play\s+karo|lagao|sunao|bajao)$/i, '')
              .trim();

            if (!ytQuery) ytQuery = 'trending songs';

            addAssistantMessage(`Opening YouTube in visible Chrome and playing "${ytQuery}"...`);
            await voice.speak(`Searching and playing ${ytQuery} on YouTube, Sir.`);

            const res = await window.electronAPI.visibleBrowserPlayYouTube(ytQuery);
            const reply = res.success ? `Now playing "${res.title}" on YouTube!` : `YouTube opened for ${ytQuery}.`;
            addAssistantMessage(reply);
            setIsThinking(false);
            return;
          }

          if (lower.includes('open') || lower.includes('kholo') || lower.includes('launch')) {
            await window.electronAPI.visibleBrowserOpen('youtube');
            const reply = 'YouTube opened in visible Chrome, Sir.';
            addAssistantMessage(reply);
            await voice.speak(reply);
            setIsThinking(false);
            return;
          }
        }

        // 4. VISIBLE GOOGLE SEARCH AUTOMATION
        if (
          lower.startsWith('search google') ||
          lower.startsWith('search on google') ||
          (lower.includes('google') && (lower.includes('search') || lower.includes('dhoondho')))
        ) {
          const gQuery = text
            .replace(/^(search\s+google\s+for|search\s+on\s+google\s+for|search\s+google|search|google\s*search)\s*/i, '')
            .replace(/^(google\s*(?:pe|par|me)?\s*)/i, '')
            .replace(/\s+(search\s*karo|dhoondho|karo|batao)$/i, '')
            .trim();

          addAssistantMessage(`Searching Google in visible Chrome for: "${gQuery || 'AI news'}"...`);
          await voice.speak(`Searching Google for ${gQuery || 'AI news'}, Sir.`);

          const res = await window.electronAPI.visibleBrowserSearchGoogle(gQuery || 'AI news');
          addAssistantMessage(res.summary);
          await voice.speak(res.summary);
          setIsThinking(false);
          return;
        }

        if (lower === 'open google' || lower === 'google kholo' || lower === 'open google in chrome') {
          await window.electronAPI.visibleBrowserOpen('google');
          const reply = 'Google homepage opened in Chrome, Sir.';
          addAssistantMessage(reply);
          await voice.speak(reply);
          setIsThinking(false);
          return;
        }

        // 5. WhatsApp Direct Message Automation
        // Matches: "whatsapp pe 9876543210 ko hello bhejo", "whatsapp pe papa ko mai ghar aa raha hu bhejo", "send hello to rahul on whatsapp"
        const isWhatsApp =
          lower.includes('whatsapp') || lower.includes('व्हाट्सएप');

        if (isWhatsApp && (lower.includes('bhejo') || lower.includes('send') || lower.includes('message') || lower.includes('msg') || lower.includes('likho') || lower.includes('ko'))) {
          let recipient = '';
          let messageBody = '';

          const matchKo = text.match(/(?:whatsapp\s+(?:pe|par|me)?\s*)?(.+?)\s+ko\s+(.+?)(?:\s+(?:bhejo|send\s+karo|likho))?$/i);
          const matchSendTo = text.match(/send\s+(.+?)\s+to\s+(.+?)(?:\s+on\s+whatsapp)?$/i);

          if (matchKo && matchKo[1] && matchKo[2]) {
            recipient = matchKo[1].replace(/^(whatsapp\s+(?:pe|par|me)?\s*)/i, '').trim();
            messageBody = matchKo[2].replace(/\s+(?:bhejo|send\s+karo)$/i, '').trim();
          } else if (matchSendTo && matchSendTo[1] && matchSendTo[2]) {
            messageBody = matchSendTo[1].trim();
            recipient = matchSendTo[2].trim();
          } else {
            recipient = 'Friend';
            messageBody = text.replace(/^(whatsapp\s+(?:pe|par|me)?\s*(?:message\s*)?(?:bhejo|send)?)/i, '').trim() || 'Hello';
          }

          const res = await window.electronAPI.sendWhatsApp(recipient, messageBody);
          addAssistantMessage(res.message);
          await voice.speak(res.message);
          setIsThinking(false);
          return;
        }

        // 6. Open ANY Installed Application on Desktop or PC (HIGHEST PRIORITY FOR APPS)
        // Matches: "open vlc", "vlc kholo", "desktop par whatsapp open karo", "brave kholo", "vscode open karo", "telegram kholo"
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
          lower.includes('चलाओ') ||
          lower.includes('chalu') ||
          lower.includes('चालू');

        if (isAppLaunch && !isWhatsApp) {
          const appTarget = text
            .replace(/^(open|launch|start|chalu\s+karo)\s+/i, '')
            .replace(/\s+(kholo|खोलो|open\s+karo|ओपन\s+करो|chalu\s+karo|चालू\s+करो|chalao|चलाओ|karo|करो)$/i, '')
            .replace(/^(desktop\s+par|desktop\s+pe|pc\s+par|laptop\s+par|computer\s+par|mera|mere)\s+/i, '')
            .replace(/\s+(desktop\s+par|desktop\s+pe|pc\s+par|laptop\s+par)$/i, '')
            .replace(/^(कृपया|please)\s+/i, '')
            .trim();

          const res = await window.electronAPI.openApp(appTarget);
          let reply = res.message;

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

