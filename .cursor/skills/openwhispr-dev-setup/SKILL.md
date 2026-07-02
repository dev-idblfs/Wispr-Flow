---
name: openwhispr-dev-setup
description: Install, run, and build OpenWhispr (Electron dictation app). Use when setting up the dev environment, running npm run dev, building with pack, configuring env, or troubleshooting Globe key compilation on macOS.
---

# OpenWhispr Dev Setup

## Prerequisites

- Node.js 18+ and npm
- macOS 10.15+ / Windows 10+ / Linux
- macOS Globe key: Xcode Command Line Tools (`xcode-select --install`)
- Python 3.7+ optional (auto-installed for local Whisper)

## Install

```bash
cd /path/to/Wispr-Flow
npm install
```

`postinstall` runs `electron-builder install-app-deps` to rebuild `better-sqlite3`.

Verify native module:
```bash
node -e "require('better-sqlite3'); console.log('OK')"
```

## Run Dev

```bash
npm run dev
```

- Compiles macOS Globe listener (`predev` → `compile:globe`)
- Starts Vite on `http://localhost:5174/`
- Launches Electron with `--dev` flag and hot reload

## Optional Env Setup

```bash
npm run setup   # creates .env from env.example if missing
```

Keys can also be set in Control Panel. **Never commit `.env`.**

## Build Unsigned App

```bash
npm run pack
```

Output: `dist/mac-arm64/OpenWhispr.app` (macOS), `dist/win-unpacked/` (Windows), `dist/linux-unpacked/` (Linux).

## Common Setup Errors

| Issue | Fix |
|-------|-----|
| `better-sqlite3` build fail | Re-run `npm install`; ensure Electron version matches |
| Globe listener compile fail | Install Xcode CLI tools on macOS |
| Port 5174 in use | Kill existing Vite/Electron processes |
| Mic not working | Grant microphone permission in System Settings |
| Paste not working (macOS) | Grant Accessibility permission |

## Key Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development with hot reload |
| `npm run start` | Production Electron (no Vite) |
| `npm run pack` | Unsigned distributable |
| `npm run build:mac/win/linux` | Signed release builds |
| `npm run lint` | ESLint in `src/` |
| `npm run compile:globe` | Build macOS Fn/Globe key listener |

## First-Run Checklist

1. Complete onboarding wizard (local or cloud Whisper)
2. Grant microphone permission
3. Grant accessibility permission (macOS, for auto-paste)
4. Test hotkey (default: backtick `` ` ``)
