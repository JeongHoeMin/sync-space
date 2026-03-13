import { app, ipcMain, BrowserWindow, desktopCapturer } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || "", "electron-vite.svg"),
    width: 900,
    height: 700,
    transparent: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.setMenu(null);
  win.webContents.on("did-finish-load", () => {
    console.log("Main window finished loading");
    win == null ? void 0 : win.show();
    win == null ? void 0 : win.focus();
  });
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load URL: ${validatedURL} with error: ${errorDescription} (${errorCode})`);
  });
  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    const levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    console.log(`[RENDERER-${levels[level] || "LOG"}] ${message} (${sourceId}:${line})`);
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(process.env.DIST || "", "index.html");
    console.log(`Loading production index from: ${indexPath}`);
    win.loadFile(indexPath).catch((err) => {
      console.error("Failed to load file:", err);
    });
  }
}
ipcMain.on("set-ignore-mouse-events", (event, ignore) => {
  const win2 = BrowserWindow.fromWebContents(event.sender);
  if (win2) {
    win2.setIgnoreMouseEvents(ignore, { forward: true });
  }
});
ipcMain.handle("get-desktop-sources", async () => {
  const sources = await desktopCapturer.getSources({ types: ["window", "screen"], thumbnailSize: { width: 300, height: 300 } });
  return sources.map((src) => ({
    id: src.id,
    name: src.name,
    thumbnail: src.thumbnail.toDataURL()
    // Send direct DataURL string
  }));
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
