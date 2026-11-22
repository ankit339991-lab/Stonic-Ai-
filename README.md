# STONIC AI - Futuristic JARVIS Windows Desktop AI Assistant

![STONIC AI](assets/icon.png)

> **STONIC AI** is a state-of-the-art Windows 10/11 desktop application inspired by JARVIS from Iron Man. Built with Electron.js, React, TypeScript, Node.js, Google Gemini, SQLite, Playwright, and Windows native automation.

---

## 🌟 Key Highlights & Capabilities

### 1. Futuristic JARVIS Interface
- **Dark Black Cyberpunk HUD**: Deep space black background (`#030712`) with glowing cyan (`#00f3ff`) and electric blue holographic accents.
- **Interactive Multi-Ring Arc Reactor Core**: High-DPI Canvas-rendered AI visualization reacting dynamically to voice listening, speech generation, and neural agent inference.
- **Audio Frequency Waveform**: Live frequency visualizer tracking speech input and output.
- **Custom Frameless Title Bar**: Futuristic window management with minimize, maximize, and minimize-to-tray controls.
- **Emergency Stop Safety Core**: Instant global emergency halt button (`Ctrl+Shift+Escape` or in-app button) to abort running tasks immediately.

### 2. Complete Voice Assistant
- **Wake Word Detection**: Local continuous listening for `"Hey Jarvis"` (or custom wake word).
- **Speech-to-Text**: Real-time microphone listening with interim and final transcript preview.
- **AI Voice Responses (TTS)**: Realistic synthesized voice output with adjustable speaking rate, pitch, and voice selection.
- **Push-To-Talk & Voice Controls**: Toggle microphone, mute/unmute audio link, and hotkey activation (`Ctrl+Shift+Space`).

### 3. Complete Windows Laptop Control
- **Application Launcher**: Native allowlisted execution for Google Chrome, YouTube, WhatsApp Desktop, Notepad, Calculator, File Explorer, Windows Settings, and PowerShell.
- **Hardware Telemetry**: Real-time polling of Battery percentage & AC charging status, CPU usage, RAM utilization, and Storage drive capacity (C:\ free space).
- **Audio Control**: Master volume increase, decrease, and mute toggles via Windows virtual keys and PowerShell.
- **Full Screen Capture**: Instant desktop screenshots saved to disk with live thumbnail preview.
- **Workstation Security**: Safe laptop workstation lock (`LockWorkStation`) with confirmation guard.
- **File & Directory Management**: Local file search, folder creation, file renaming, and safe folder categorization.

### 4. Autonomous AI Agent System
- **Intelligent Task Decomposition**: Takes complex user goals (e.g., *"Find the latest AI news and create a summary document"*) and breaks them down into sequential executable steps.
- **Tool Selection Matrix**: Automatically invokes web search, webpage scraping, document reader, document writer, system controls, image generation, or memory storage.
- **Live Execution Stream**: Real-time step progress indicators (Pending, In Progress, Retrying, Completed, Failed) with detailed event telemetry logs.
- **Autonomous Task Controls**: Pause, resume, cancel, or retry tasks with error handling and retry limits.
- **Executive Completion Reports**: Synthesizes verified multi-step results into a final report.

### 5. Playwright Browser Automation
- **Web Search Engine**: Live queries through DuckDuckGo/Google with link extraction.
- **Headless Webpage Scraper**: Safely extracts readable article body content, strips advertisements and scripts, and captures full-resolution webpage snapshots.
- **Research Synthesizer**: Formats gathered web sources into structured intelligence reports.

### 6. Document & File Intelligence
- **Universal Document Reader**:
  - **PDF**: Full text extraction via `pdf-parse`.
  - **Word (.docx)**: Clean formatting and text extraction via `mammoth`.
  - **Excel (.xlsx, .xls, .csv)**: Sheet-by-sheet inspection and tabular data rendering via `xlsx`.
  - **Code & Text**: Reads `.txt`, `.md`, `.json`, `.py`, `.ts`, `.html`, etc.
- **AI Document Summarizer**: Generates executive summaries and key takeaways with a single click.
- **Document Creator**: Creates new Markdown and text files directly on your Windows Desktop.
- **Smart Folder Organizer**: Previews and sorts cluttered folders into categorized subdirectories (Documents, Images, Videos, Code, Audio) with strict user confirmation.

### 7. Personal Memory Matrix (SQLite)
- **Local Embedded Database**: Persistent SQLite database (`stonic_memory.db`) using WebAssembly `sql.js`.
- **Memory Categories**: User preferences, custom instructions, task insights, project notes, and user facts.
- **Memory Management**: Add, search, filter, edit, delete, and export all memories to JSON.

### 8. Modular Skills Matrix
10 Granular Subsystems with independent permission toggles:
1. **Browser Research**
2. **Laptop Control**
3. **File Management**
4. **Document Assistant**
5. **Coding Assistant**
6. **Business Research**
7. **Study Assistant**
8. **YouTube Assistant**
9. **Communication Assistant**
10. **Image Generation**

### 9. Visual Intelligence Hub
- **Real AI Image Generation**: High-resolution 1024x1024 image synthesis saved locally to `userData/generated_images`.
- **Multimodal Vision Understanding**: Upload or drag-and-drop any image for Gemini vision analysis.
- **Interactive Diagram Studio**: Renders Mermaid flowcharts, mind maps, and sequence diagrams with real-time SVG compilation.

---

## 📁 Project Structure

```
stonic Ai/
├── assets/
│   ├── icon.png                 # 256x256 Holographic Arc Reactor Icon
│   ├── icon.ico                 # Windows Application Icon
│   ├── sql-wasm.wasm            # Embedded SQLite WebAssembly engine
│   └── generate_icons.ps1       # Vector icon generator
├── dist-electron/               # Compiled Electron main process & services
├── dist-react/                  # Bundled React production build
├── electron/
│   ├── main.ts                  # Electron window lifecycle, tray, global shortcuts, IPC
│   ├── preload.ts               # ContextBridge secure API definition
│   ├── python/
│   │   └── system_helper.py     # Python bridge for battery, storage, volume, lock
│   └── services/
│       ├── agent.ts             # Autonomous multi-step AI Agent orchestrator
│       ├── browser.ts           # Playwright headless browser automation
│       ├── database.ts          # Persistent SQLite memory & task storage
│       ├── document.ts          # PDF, Word (.docx), Excel (.xlsx), text parser
│       ├── gemini.ts            # Gemini API client, streaming chat & vision
│       ├── settings.ts          # JSON configuration store & startup management
│       └── system.ts            # Windows hardware & application control
├── release/                     # Packaged Windows installer (.exe)
├── src/                         # React 18 + TypeScript + TailwindCSS
│   ├── App.tsx                  # Root application shell & intent dispatcher
│   ├── index.css                # Futuristic scanlines, cyber grid & animations
│   ├── index.html               # Main HTML entry with Orbitron & Rajdhani fonts
│   ├── main.tsx                 # React DOM mount
│   ├── components/
│   │   ├── agent/               # Autonomous Agent planner, steps & report modal
│   │   ├── browser/             # Playwright browser search & scrape viewer
│   │   ├── common/              # Security confirmation modal
│   │   ├── documents/           # Document reader, table preview & folder organizer
│   │   ├── jarvis-core/         # Arc Reactor Canvas, Voice Wave, Chat HUD
│   │   ├── laptop-control/      # Hardware gauges, app launchers, volume, screenshot
│   │   ├── layout/              # TitleBar & Sidebar
│   │   ├── memory/              # SQLite memory manager & JSON export
│   │   ├── settings/            # API key, TTS voice, wake-word & startup config
│   │   ├── skills/              # 10 modular skills matrix with permission toggles
│   │   ├── tasks/               # Background task history & execution logs
│   │   └── visual-hub/          # Real AI image generator, vision & Mermaid diagrams
│   ├── hooks/
│   │   ├── useSystemStatus.ts   # Live telemetry polling hook
│   │   └── useVoiceAssistant.ts # Speech recognition, wake-word & TTS hook
│   └── types/
│       └── electron.d.ts        # Window.electronAPI TypeScript declarations
├── electron-builder.json        # Windows NSIS installer configuration
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.electron.json
└── vite.config.ts
```

---

## 🚀 Setup & Installation Instructions

### Prerequisites
- **Operating System**: Windows 10 or Windows 11 (64-bit).
- **Node.js**: v18.0.0 or higher (v24.x tested).
- **Python**: Python 3.8+ (for system hardware helper).

### 1. Install Dependencies
In the root directory `c:\Users\Dell\Desktop\stonic Ai`, run:
```bash
npm install
```

### 2. Download Playwright Chromium Browser
```bash
npx playwright install chromium
```

### 3. Configure Gemini API Key
You can configure your API key in either of two ways:
1. **Inside the App**: Open **Settings** inside STONIC AI, paste your Google Gemini API key, and click **Test Key** and **Save Configuration**.
2. **Environment Variable**: Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

## 🛠️ Running the Application

### Running in Development Mode
To run the React frontend with Vite HMR and launch Electron:
```bash
npm run dev
```
Or run separately in two terminals:
- **Terminal 1**: `npm run dev:react`
- **Terminal 2**: `npm run build:electron && npm run dev:electron`

---

## 📦 Building the Windows Installer (.exe)

To compile both frontend and backend, and create the standalone Windows NSIS Installer (.exe):
```bash
npm run dist
```
The installer will be generated in the `release/` directory:
- **Installer File**: `release/STONIC AI Setup 1.0.0.exe`
- **Portable Unpacked Directory**: `release/win-unpacked/`

### Features of the Installer:
- Clean Windows installation wizard (NSIS).
- Creates a Desktop shortcut named **STONIC AI**.
- Creates a Start Menu shortcut.
- Bundles all required runtime files, SQLite wasm, Python scripts, and assets.
- Compatible with Windows 10 and Windows 11.

---

## 🔒 Security & Safety Controls

STONIC AI enforces strict safety protocols:
1. **No Arbitrary Commands**: Only safe, allowlisted Windows actions and applications can be launched.
2. **Confirmation Modals**: Destructive operations such as workstation locking or file reorganization require explicit user approval.
3. **No Autonomous Financial or Private Actions**: The assistant will never perform financial transactions or transmit private data without approval.
4. **Emergency Stop**: Press `Ctrl+Shift+Escape` or click the **STOP** button in the title bar at any time to instantly freeze and cancel all running agent operations.
5. **Local Data Storage**: All memories, settings, and logs are kept strictly local on your laptop in SQLite and JSON files.

