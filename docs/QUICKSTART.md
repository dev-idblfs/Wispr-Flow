# OpenWhispr Quick Start

Condensed guide for developers and AI agents. See [AGENTS.md](../AGENTS.md) for full onboarding.

## Prerequisites

- **Node.js 18+** and npm
- **macOS / Windows / Linux**
- macOS Globe key: Xcode Command Line Tools
- Python 3.7+ (optional — auto-installed for local Whisper)

## Install & Run

```bash
git clone https://github.com/HeroTools/open-whispr.git
cd open-whispr   # or Wispr-Flow
npm install
npm run dev
```

Dev mode starts Vite (`localhost:5174`) and Electron with hot reload.

## Optional: API Keys (Cloud Mode)

```bash
npm run setup          # copies env.example → .env
# Edit .env — or configure keys in Control Panel after launch
```

Never commit `.env`.

## Build Unsigned App

```bash
npm run pack
# macOS: dist/mac-arm64/OpenWhispr.app
```

## First-Run Checklist

- [ ] Complete onboarding (local or cloud Whisper)
- [ ] Grant **microphone** permission
- [ ] Grant **accessibility** permission (macOS — required for auto-paste)
- [ ] Test hotkey (default: backtick `` ` ``)
- [ ] For local mode: download a Whisper model (base recommended)

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development with hot reload |
| `npm run start` | Production Electron |
| `npm run pack` | Unsigned build |
| `npm run lint` | ESLint |
| `npm run compile:globe` | macOS Globe/Fn key listener |

## Troubleshooting

| Problem | See |
|---------|-----|
| No audio / transcription fails | [DEBUG.md](../DEBUG.md) |
| Local Whisper setup | [LOCAL_WHISPER_SETUP.md](../LOCAL_WHISPER_SETUP.md) |
| General issues | [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) |

Enable debug: `OPENWHISPR_DEBUG=true npm run dev` or `--debug` flag.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) and the visual diagram at [assets/architecture-overview.png](assets/architecture-overview.png).

Deep reference: [CLAUDE.md](../CLAUDE.md)
