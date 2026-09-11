// OS Emulator — desktop wrapper. Requires the same server.js used standalone
// (see its start() export) rather than re-implementing anything, and points
// a plain BrowserWindow at it — the emulator page itself is unmodified,
// identical to running it in a regular browser tab.
const { app, BrowserWindow } = require("electron");
const { autoUpdater } = require("electron-updater");
const { start } = require("../server.js");

// v86 is a WebAssembly CPU emulator drawing to a <canvas> every frame —
// about as GPU/compute-hungry as this app gets, so hardware acceleration
// matters even more here than in a typical Electron app. Chromium's driver
// blocklist errs broad and can silently fall back to software rendering on
// perfectly capable hardware; these three flags are the standard override.
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");

const PORT = 6060;
let mainWindow;

async function createWindow() {
  await start(PORT);
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(async () => {
  await createWindow();
  // Throws in a dev run (no packaged app, no latest.yml to compare against)
  // — only meaningful once this is an installed build checking GitHub
  // Releases for something newer.
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((e) => {
      console.error("Update check failed:", e.message);
    });
  }
});

app.on("window-all-closed", () => app.quit());
