const { app, clipboard, systemPreferences } = require("electron");
const { spawn, spawnSync } = require("child_process");

class ClipboardManager {
  constructor() {
    // Initialize clipboard manager
  }

  // Safe logging method - only log in development
  safeLog(...args) {
    if (process.env.NODE_ENV === "development") {
      try {
        console.log(...args);
      } catch (error) {
        // Silently ignore EPIPE errors in logging
        if (error.code !== "EPIPE") {
          process.stderr.write(`Log error: ${error.message}\n`);
        }
      }
    }
  }

  async pasteText(text) {
    try {
      // Save original clipboard content first
      const originalClipboard = clipboard.readText();
      this.safeLog(
        "💾 Saved original clipboard content:",
        originalClipboard.substring(0, 50) + "..."
      );

      // Copy text to clipboard first - this always works
      clipboard.writeText(text);
      this.safeLog(
        "📋 Text copied to clipboard:",
        text.substring(0, 50) + "..."
      );

      if (process.platform === "darwin") {
        // Check accessibility permissions first
        this.safeLog(
          "🔍 Checking accessibility permissions for paste operation..."
        );
        const hasPermissions = await this.checkAccessibilityPermissions();

        if (!hasPermissions) {
          this.safeLog(
            "⚠️ No accessibility permissions - text copied to clipboard only"
          );
          const errorMsg =
            "Accessibility permissions required for automatic pasting. Text has been copied to clipboard - please paste manually with Cmd+V.";
          throw new Error(errorMsg);
        }

        this.safeLog("✅ Permissions granted, attempting to paste...");
        return await this.pasteMacOS(originalClipboard);
      } else if (process.platform === "win32") {
        return await this.pasteWindows(originalClipboard);
      } else {
        return await this.pasteLinux(originalClipboard);
      }
    } catch (error) {
      throw error;
    }
  }

  getAccessibilityTargetName() {
    const isDev =
      process.env.NODE_ENV === "development" ||
      process.argv.includes("--dev") ||
      process.defaultApp;

    return isDev ? "Electron" : app.getName() || "OpenWhispr";
  }

  async pasteMacOS(originalClipboard) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const pasteProcess = spawn("osascript", [
          "-e",
          'tell application "System Events" to keystroke "v" using command down',
        ]);

        let errorOutput = "";
        let hasTimedOut = false;

        pasteProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });

        pasteProcess.on("close", (code) => {
          if (hasTimedOut) return;

          // Clear timeout first
          clearTimeout(timeoutId);

          // Clean up the process reference
          pasteProcess.removeAllListeners();

          if (code === 0) {
            this.safeLog("✅ Text pasted successfully via Cmd+V simulation");
            setTimeout(() => {
              clipboard.writeText(originalClipboard);
              this.safeLog("🔄 Original clipboard content restored");
            }, 100);
            resolve();
          } else {
            if (this.isKeystrokePermissionError(errorOutput)) {
              this.showAccessibilityDialog(errorOutput);
              systemPreferences.isTrustedAccessibilityClient(true);
            }

            const detail = errorOutput.trim()
              ? ` ${errorOutput.trim()}`
              : "";
            const errorMsg = `Paste failed (code ${code}).${detail} Text is copied to clipboard - please paste manually with Cmd+V.`;
            reject(new Error(errorMsg));
          }
        });

        pasteProcess.on("error", (error) => {
          if (hasTimedOut) return;
          clearTimeout(timeoutId);
          pasteProcess.removeAllListeners();
          const errorMsg = `Paste command failed: ${error.message}. Text is copied to clipboard - please paste manually with Cmd+V.`;
          reject(new Error(errorMsg));
        });

        const timeoutId = setTimeout(() => {
          hasTimedOut = true;
          pasteProcess.kill("SIGKILL");
          pasteProcess.removeAllListeners();
          const errorMsg =
            "Paste operation timed out. Text is copied to clipboard - please paste manually with Cmd+V.";
          reject(new Error(errorMsg));
        }, 3000);
      }, 100);
    });
  }

  async pasteWindows(originalClipboard) {
    return new Promise((resolve, reject) => {
      const pasteProcess = spawn("powershell", [
        "-Command",
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")',
      ]);

      pasteProcess.on("close", (code) => {
        if (code === 0) {
          // Text pasted successfully
          setTimeout(() => {
            clipboard.writeText(originalClipboard);
          }, 100);
          resolve();
        } else {
          reject(
            new Error(
              `Windows paste failed with code ${code}. Text is copied to clipboard.`
            )
          );
        }
      });

      pasteProcess.on("error", (error) => {
        reject(
          new Error(
            `Windows paste failed: ${error.message}. Text is copied to clipboard.`
          )
        );
      });
    });
  }

  async pasteLinux(originalClipboard) {
    // Helper to check if a command exists
    const commandExists = (cmd) => {
      try {
        const res = spawnSync("sh", ["-c", `command -v ${cmd}`], {
          stdio: "ignore",
        });
        return res.status === 0;
      } catch {
        return false;
      }
    };

    // Detect if running on Wayland or X11
    const isWayland =
      (process.env.XDG_SESSION_TYPE || "").toLowerCase() === "wayland" ||
      !!process.env.WAYLAND_DISPLAY;

    // Define paste tools in preference order based on display server
    const candidates = isWayland
      ? [
          // Wayland tools
          { cmd: "wtype", args: ["-M", "ctrl", "-p", "v", "-m", "ctrl"] },
          // ydotool requires uinput permissions but included as fallback
          { cmd: "ydotool", args: ["key", "29:1", "47:1", "47:0", "29:0"] },
          // X11 fallback for XWayland
          { cmd: "xdotool", args: ["key", "ctrl+v"] },
        ]
      : [
          // X11 tools
          { cmd: "xdotool", args: ["key", "ctrl+v"] },
        ];

    // Filter to only available tools
    const available = candidates.filter((c) => commandExists(c.cmd));

    // Attempt paste with a specific tool
    const pasteWith = (tool) =>
      new Promise((resolve, reject) => {
        const proc = spawn(tool.cmd, tool.args);

        let timedOut = false;
        const timeoutId = setTimeout(() => {
          timedOut = true;
          try {
            proc.kill("SIGKILL");
          } catch {
            // Ignore kill errors
          }
        }, 1000);

        proc.on("close", (code) => {
          if (timedOut)
            return reject(
              new Error(`Paste with ${tool.cmd} timed out after 1 second`)
            );
          clearTimeout(timeoutId);

          if (code === 0) {
            // Restore original clipboard after successful paste
            setTimeout(() => clipboard.writeText(originalClipboard), 100);
            resolve();
          } else {
            reject(new Error(`${tool.cmd} exited with code ${code}`));
          }
        });

        proc.on("error", (error) => {
          if (timedOut) return;
          clearTimeout(timeoutId);
          reject(error);
        });
      });

    // Try each available tool in order
    for (const tool of available) {
      try {
        await pasteWith(tool);
        this.safeLog(`✅ Paste successful using ${tool.cmd}`);
        return; // Success!
      } catch (error) {
        this.safeLog(
          `⚠️ Paste with ${tool.cmd} failed:`,
          error?.message || error
        );
        // Continue to next tool
      }
    }

    // All tools failed - create specific error for renderer to handle
    const sessionInfo = isWayland ? "Wayland" : "X11";
    const errorMsg = `Clipboard copied, but paste simulation failed on ${sessionInfo}. Please install ${isWayland ? "wtype or ydotool" : "xdotool"} for automatic pasting, or paste manually with Ctrl+V.`;
    const err = new Error(errorMsg);
    err.code = "PASTE_SIMULATION_FAILED";
    throw err;
  }

  isKeystrokePermissionError(errorText = "") {
    return (
      errorText.includes("not allowed to send keystrokes") ||
      errorText.includes("not allowed assistive access") ||
      errorText.includes("(-1719)") ||
      errorText.includes("(-25006)") ||
      errorText.includes("(1002)")
    );
  }

  async checkAccessibilityPermissions() {
    if (process.platform !== "darwin") return true;

    const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (isTrusted) {
      return this.verifyKeystrokePermission();
    }

    systemPreferences.isTrustedAccessibilityClient(true);
    this.showAccessibilityDialog("");
    return false;
  }

  async verifyKeystrokePermission() {
    return new Promise((resolve) => {
      const testProcess = spawn("osascript", [
        "-e",
        'tell application "System Events" to keystroke ""',
      ]);

      let testError = "";

      testProcess.stderr.on("data", (data) => {
        testError += data.toString();
      });

      testProcess.on("close", (code) => {
        if (code === 0) {
          resolve(true);
          return;
        }

        if (this.isKeystrokePermissionError(testError)) {
          this.showAccessibilityDialog(testError);
          systemPreferences.isTrustedAccessibilityClient(true);
          resolve(false);
          return;
        }

        // Non-permission AppleScript errors should not block paste attempts.
        resolve(true);
      });

      testProcess.on("error", () => {
        resolve(false);
      });
    });
  }

  showAccessibilityDialog(testError) {
    const isStuckPermission = this.isKeystrokePermissionError(testError);
    const targetApp = this.getAccessibilityTargetName();
    const isDev = targetApp === "Electron";

    let dialogMessage;
    if (isStuckPermission) {
      dialogMessage = `OpenWhispr needs Accessibility permission to simulate Cmd+V.

In dev mode, macOS usually lists the app as "${targetApp}" (not OpenWhispr).

To fix:
1. Open System Settings -> Privacy & Security -> Accessibility
2. Remove stale OpenWhispr or Electron entries
3. Add "${targetApp}" and enable it
4. Restart the app

Without this, text is copied to clipboard only.

Open System Settings now?`;
    } else if (isDev) {
      dialogMessage = `OpenWhispr needs Accessibility permission to paste automatically.

When running npm run dev, enable "${targetApp}" in:
System Settings -> Privacy & Security -> Accessibility

Then restart the app. Text will stay on the clipboard until then.

Open System Settings now?`;
    } else {
      dialogMessage = `OpenWhispr needs Accessibility permissions to paste text into other applications.

Clipboard copy works, but Cmd+V simulation is blocked.

To fix:
1. Open System Settings -> Privacy & Security -> Accessibility
2. Add "${targetApp}" and enable it
3. Restart OpenWhispr

Open System Settings now?`;
    }

    const permissionDialog = spawn("osascript", [
      "-e",
      `display dialog "${dialogMessage}" buttons {"Cancel", "Open System Settings"} default button "Open System Settings"`,
    ]);

    permissionDialog.on("close", (dialogCode) => {
      if (dialogCode === 0) {
        this.openSystemSettings();
      }
    });

    permissionDialog.on("error", (error) => {
      // Permission dialog error - user will need to manually grant permissions
    });
  }

  openSystemSettings() {
    const settingsCommands = [
      [
        "open",
        [
          "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
        ],
      ],
      ["open", ["-b", "com.apple.systempreferences"]],
      ["open", ["/System/Library/PreferencePanes/Security.prefPane"]],
    ];

    let commandIndex = 0;
    const tryNextCommand = () => {
      if (commandIndex < settingsCommands.length) {
        const [cmd, args] = settingsCommands[commandIndex];
        const settingsProcess = spawn(cmd, args);

        settingsProcess.on("error", (error) => {
          commandIndex++;
          tryNextCommand();
        });

        settingsProcess.on("close", (settingsCode) => {
          if (settingsCode !== 0) {
            commandIndex++;
            tryNextCommand();
          }
        });
      } else {
        // All settings commands failed, try fallback
        spawn("open", ["-a", "System Preferences"]).on("error", () => {
          spawn("open", ["-a", "System Settings"]).on("error", () => {
            // Could not open settings app
          });
        });
      }
    };

    tryNextCommand();
  }

  async readClipboard() {
    try {
      const text = clipboard.readText();
      return text;
    } catch (error) {
      throw error;
    }
  }

  async writeClipboard(text) {
    try {
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ClipboardManager;
