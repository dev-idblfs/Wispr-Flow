# OpenWhispr Architecture

Visual overview: [assets/architecture-overview.png](assets/architecture-overview.png)

## System Overview

```mermaid
flowchart LR
  subgraph user [User]
    Hotkey[Global hotkey or Globe key]
  end
  subgraph renderer [Renderer - React/Vite]
    Record[MediaRecorder]
    UI[Overlay + Control Panel]
  end
  subgraph main [Main Process - Electron]
    IPC[ipcHandlers.js]
    FFmpeg[ffmpeg-static]
    Whisper[whisper.js + whisper_bridge.py]
    DB[(SQLite history)]
    Paste[clipboard.js]
  end
  subgraph optional [Optional AI]
    Reasoning[ReasoningService.ts]
  end
  Hotkey --> Record
  Record -->|Base64 audio via IPC| IPC
  IPC --> FFmpeg --> Whisper
  Whisper --> Reasoning
  Whisper --> Paste
  Whisper --> DB
  UI --> IPC
```

## Dual-Window Model

```mermaid
flowchart TB
  subgraph electron [Electron App]
    MainWin[Main Window<br/>Draggable overlay]
    ControlWin[Control Panel<br/>Settings + History]
    Tray[System Tray]
  end
  subgraph react [React App - Vite]
    AppJsx[App.jsx]
    ControlPanel[ControlPanel.tsx]
  end
  MainWin --> AppJsx
  ControlWin --> ControlPanel
  Tray -->|Open settings| ControlWin
```

Both windows share the same React codebase. Routing distinguishes overlay vs control panel.

## Audio Pipeline

```mermaid
sequenceDiagram
  participant U as User
  participant R as Renderer
  participant M as Main Process
  participant F as FFmpeg
  participant W as whisper_bridge.py
  participant C as Clipboard

  U->>R: Press hotkey (start)
  R->>R: MediaRecorder collects chunks
  U->>R: Press hotkey (stop)
  R->>M: IPC send audio (Base64)
  M->>M: Write temp audio file
  M->>F: Convert audio format
  F->>W: Processed audio path
  W->>M: JSON transcription result
  M->>C: Paste at cursor
  M->>M: Save to SQLite
  M->>R: Return result to UI
```

## Reasoning Flow (Agent Commands)

```mermaid
flowchart LR
  Text[Transcribed text] --> Detect{Agent addressed?}
  Detect -->|No| Paste[Direct paste]
  Detect -->|Yes| RS[ReasoningService.ts]
  RS --> OpenAI[OpenAI Responses API]
  RS --> Anthropic[Anthropic via IPC]
  RS --> Gemini[Gemini API]
  RS --> Local[Local llama.cpp]
  OpenAI --> Output[Processed text]
  Anthropic --> Output
  Gemini --> Output
  Local --> Output
  Output --> Paste
```

Agent name detected via "Hey [AgentName]" pattern. Agent reference removed from final output.

## File Map

| Layer | Path | Role |
|-------|------|------|
| Entry | `main.js` | Electron bootstrap, manager init |
| Bridge | `preload.js` | Secure `window.api` IPC surface |
| IPC | `src/helpers/ipcHandlers.js` | All IPC channel handlers |
| Audio | `src/helpers/whisper.js` | Whisper orchestration |
| DB | `src/helpers/database.js` | SQLite transcription history |
| Paste | `src/helpers/clipboard.js` | Cross-platform paste |
| Python | `whisper_bridge.py` | Local Whisper transcription |
| Overlay | `src/App.jsx` | Dictation UI |
| Settings | `src/components/ControlPanel.tsx` | Control panel |
| AI | `src/services/ReasoningService.ts` | Multi-provider reasoning |
| Hooks | `src/hooks/` | Settings, audio, hotkey, permissions |

## Process Boundaries

- **Renderer**: React UI, MediaRecorder, no Node.js access
- **Preload**: Context-isolated bridge (`window.api`)
- **Main**: File I/O, native modules, Python spawn, clipboard, DB
- **Python**: Stateless Whisper transcription (30s timeout)

## Further Reading

- [CLAUDE.md](../CLAUDE.md) — comprehensive technical reference
- [AGENTS.md](../AGENTS.md) — agent onboarding
- [QUICKSTART.md](QUICKSTART.md) — run guide
