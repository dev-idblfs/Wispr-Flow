---
name: openwhispr-debug
description: Debug OpenWhispr audio, Whisper, FFmpeg, Python, and clipboard issues. Use when diagnosing transcription failures, no audio detected, paste problems, or enabling verbose logging.
---

# OpenWhispr Debug

## Enable Debug Mode

**CLI flag:**
```bash
npm run dev -- --debug
# or production: electron . --debug
```

**Environment variable:**
```bash
OPENWHISPR_DEBUG=true npm run dev
```

## Log Locations

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/open-whispr/logs/debug-*.log` |
| Windows | `%APPDATA%/open-whispr/logs/debug-*.log` |
| Linux | `~/.config/open-whispr/logs/debug-*.log` |

## What Logs Capture

- FFmpeg path resolution (bundled vs system, ASAR unpack)
- Audio recording: permissions, chunk sizes, silence detection
- Temp file creation and Whisper command construction
- Python bridge stdout/stderr and timeout (30s)
- Reasoning pipeline stages (if agent command detected)

## Common Failure Modes

### No Audio Detected
1. Check mic permission in System Settings
2. Verify audio chunks in debug log (non-zero sizes)
3. Check FFmpeg found and executable

### FFmpeg Not Found
- Bundled path: `app.asar.unpacked/node_modules/ffmpeg-static/`
- Log shows all paths checked; verify ASAR unpack in build

### Local Whisper Fails
1. Python installed? (`python3 --version`)
2. Whisper package installed? (Control Panel → install)
3. Model downloaded? (`~/.cache/whisper/` or `~/.cache/openwhispr/models`)
4. Check `whisper_bridge.py` stderr in logs

### Text Not Pasting (macOS)
1. Accessibility permission required
2. Use Control Panel → "Fix Permission Issues"
3. Fallback: text copied to clipboard — manual Cmd+V

### Cloud Transcription Fails
1. Verify `OPENAI_API_KEY` in `.env` or Control Panel
2. Check API credits and network
3. Log shows "OpenAI API Key present: Yes/No"

## Triage Commands

```bash
# Verify FFmpeg bundled
ls node_modules/ffmpeg-static/ffmpeg

# Test Python bridge manually
python3 whisper_bridge.py --help

# Check SQLite
node -e "const db=require('better-sqlite3')('test.db'); console.log('OK'); db.close()"
```

## Related Docs

- [DEBUG.md](../../DEBUG.md) — full debug guide
- [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) — user-facing issues
- [LOCAL_WHISPER_SETUP.md](../../LOCAL_WHISPER_SETUP.md) — local Whisper setup
