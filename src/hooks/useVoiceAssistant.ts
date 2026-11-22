import { useState, useEffect, useRef, useCallback } from 'react';

export interface VoiceAssistantOptions {
  wakeWord?: string;
  wakeWordEnabled?: boolean;
  voiceSettings?: {
    voiceURI?: string;
    pitch?: number;
    rate?: number;
    volume?: number;
  };
  onCommand?: (command: string) => void;
}

export function useVoiceAssistant({
  wakeWord = 'Hey Jarvis',
  wakeWordEnabled = true,
  voiceSettings = { pitch: 1.0, rate: 1.05, volume: 1.0 },
  onCommand,
}: VoiceAssistantOptions) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [wakeWordDetected, setWakeWordDetected] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  // Load available speech synthesis voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Initialize Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API is not supported in this browser environment.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN'; // Set to Hindi (India) - also understands Hinglish & English loanwords cleanly

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      // Auto restart if not muted and listening was active
      if (!isMuted && isListening) {
        try {
          recognition.start();
        } catch {
          // ignore already started
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.warn('Speech recognition error:', event.error);
      }
    };

    recognition.onresult = (event: any) => {
      let currentInterim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text;
        } else {
          currentInterim += text;
        }
      }

      const activeText = (finalTranscript || currentInterim).trim();
      setTranscript(activeText);

      // Check Wake Word: "Hey Jarvis", "Jarvis", or Hindi equivalents "जारविस", "हे जारविस"
      const lower = activeText.toLowerCase();
      const targetWake = (wakeWord || 'hey jarvis').toLowerCase();
      const isWakeWord =
        lower.includes(targetWake) ||
        lower.includes('jarvis') ||
        activeText.includes('जारविस') ||
        activeText.includes('जार्विस') ||
        activeText.includes('हे जारविस');

      if (wakeWordEnabled && isWakeWord) {
        setWakeWordDetected(true);
        // Play subtle futuristic wake chime
        playChime(880, 0.1);

        // Extract command following wake word
        let command = activeText;
        if (lower.includes(targetWake)) {
          const index = lower.indexOf(targetWake);
          command = activeText.substring(index + targetWake.length).trim();
        } else if (lower.includes('jarvis')) {
          const index = lower.indexOf('jarvis');
          command = activeText.substring(index + 6).trim();
        } else if (activeText.includes('जारविस')) {
          const index = activeText.indexOf('जारविस');
          command = activeText.substring(index + 6).trim();
        } else if (activeText.includes('जार्विस')) {
          const index = activeText.indexOf('जार्विस');
          command = activeText.substring(index + 7).trim();
        }

        if (finalTranscript && command) {
          if (onCommandRef.current) {
            onCommandRef.current(command);
          }
          setTranscript('');
          setTimeout(() => setWakeWordDetected(false), 2000);
        }
      } else if (finalTranscript && !wakeWordEnabled) {
        // Direct speech command without wake word requirement
        if (onCommandRef.current) {
          onCommandRef.current(finalTranscript);
        }
        setTranscript('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [wakeWord, wakeWordEnabled, isMuted]);

  // Audio chime generator using Web Audio API
  const playChime = (freq: number = 880, duration: number = 0.15) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  };

  const startListening = useCallback(() => {
    if (isMuted) setIsMuted(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.log('Recognition already started or error', e);
      }
    }
  }, [isMuted]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        stopListening();
      } else {
        startListening();
      }
      return next;
    });
  }, [startListening, stopListening]);

  // Text-To-Speech (AI Voice Generation)
  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!('speechSynthesis' in window) || isMuted) {
          resolve();
          return;
        }

        // Cancel previous speech if playing
        window.speechSynthesis.cancel();

        // Strip markdown asterisks, hashes, and formatting for clean natural speech
        const cleanText = text
          .replace(/[#*_`~>-]/g, ' ')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .trim();

        if (!cleanText) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Select chosen voice or prefer native Hindi (Hemant / Kalpana / Google हिन्दी)
        if (voiceSettings.voiceURI) {
          const match = availableVoices.find((v) => v.voiceURI === voiceSettings.voiceURI || v.name === voiceSettings.voiceURI);
          if (match) utterance.voice = match;
        }

        if (!utterance.voice) {
          const preferred =
            availableVoices.find((v) => v.name.includes('Hemant') || v.voiceURI.includes('Hemant')) ||
            availableVoices.find((v) => v.lang === 'hi-IN' || v.lang.startsWith('hi')) ||
            availableVoices.find((v) => v.name.includes('Kalpana') || v.name.includes('Hindi')) ||
            availableVoices.find(
              (v) =>
                (v.name.includes('David') ||
                  v.name.includes('Natural') ||
                  v.name.includes('George') ||
                  v.name.includes('Google UK English Male')) &&
                v.lang.startsWith('en')
            );
          if (preferred) utterance.voice = preferred;
        }

        utterance.lang = utterance.voice?.lang || 'hi-IN';
        utterance.pitch = voiceSettings.pitch ?? 1.0;
        utterance.rate = voiceSettings.rate ?? 1.0;
        utterance.volume = voiceSettings.volume ?? 1.0;

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [availableVoices, voiceSettings, isMuted]
  );

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    wakeWordDetected,
    isMuted,
    availableVoices,
    startListening,
    stopListening,
    toggleMute,
    speak,
    stopSpeaking,
  };
}

