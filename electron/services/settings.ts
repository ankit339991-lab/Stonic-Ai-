import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface StonicSettings {
  geminiApiKey: string;
  geminiModel: string;
  wakeWordEnabled: boolean;
  wakeWord: string;
  listenWhenMinimized: boolean;
  voiceSettings: {
    voiceURI: string;
    pitch: number;
    rate: number;
    volume: number;
  };
  autoStartOnBoot: boolean;
  theme: string;
  skillsPermissions: {
    browserResearch: boolean;
    laptopControl: boolean;
    fileManagement: boolean;
    documentAssistant: boolean;
    codingAssistant: boolean;
    businessResearch: boolean;
    studyAssistant: boolean;
    youtubeAssistant: boolean;
    communicationAssistant: boolean;
    imageGeneration: boolean;
  };
}

const DEFAULT_SETTINGS: StonicSettings = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: 'gemini-2.0-flash',
  wakeWordEnabled: true,
  wakeWord: 'Hey Jarvis',
  listenWhenMinimized: false,
  voiceSettings: {
    voiceURI: '',
    pitch: 1.0,
    rate: 1.05,
    volume: 1.0,
  },
  autoStartOnBoot: false,
  theme: 'dark-jarvis',
  skillsPermissions: {
    browserResearch: true,
    laptopControl: true,
    fileManagement: true,
    documentAssistant: true,
    codingAssistant: true,
    businessResearch: true,
    studyAssistant: true,
    youtubeAssistant: true,
    communicationAssistant: true,
    imageGeneration: true,
  },
};

export class SettingsService {
  private configPath: string;
  private settings: StonicSettings;

  constructor() {
    let dir: string;
    try {
      dir = app.getPath('userData');
    } catch {
      dir = path.join(process.cwd(), '.stonic_data');
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.configPath = path.join(dir, 'stonic_settings.json');
    this.settings = this.load();
  }

  private load(): StonicSettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          skillsPermissions: {
            ...DEFAULT_SETTINGS.skillsPermissions,
            ...(parsed.skillsPermissions || {}),
          },
        };
      }
    } catch (e) {
      console.error('Error loading settings, using defaults', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  getSettings(): StonicSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<StonicSettings>): StonicSettings {
    this.settings = {
      ...this.settings,
      ...updates,
      skillsPermissions: {
        ...this.settings.skillsPermissions,
        ...(updates.skillsPermissions || {}),
      },
    };

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save settings to disk', e);
    }

    // Configure Windows login auto-launch if requested
    try {
      if (updates.autoStartOnBoot !== undefined && typeof app.setLoginItemSettings === 'function') {
        app.setLoginItemSettings({
          openAtLogin: !!updates.autoStartOnBoot,
          path: app.getPath('exe'),
        });
      }
    } catch (err) {
      console.error('Error setting login item settings', err);
    }

    return { ...this.settings };
  }
}

