import { app as r, ipcMain as p, BrowserWindow as a, desktopCapturer as m } from "electron";
import s from "node:path";
import { fileURLToPath as w } from "node:url";
const h = w(import.meta.url), f = s.dirname(h);
process.env.DIST = s.join(f, "../dist");
process.env.VITE_PUBLIC = r.isPackaged ? process.env.DIST : s.join(process.env.DIST, "../public");
let e;
const d = process.env.VITE_DEV_SERVER_URL;
function u() {
  if (e = new a({
    icon: s.join(process.env.VITE_PUBLIC || "", "electron-vite.svg"),
    width: 900,
    height: 700,
    transparent: !1,
    frame: !0,
    webPreferences: {
      preload: s.join(f, "preload.js"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), e.setMenu(null), e.webContents.on("did-finish-load", () => {
    console.log("Main window finished loading"), e == null || e.show(), e == null || e.focus();
  }), e.webContents.on("did-fail-load", (n, o, t, i) => {
    console.error(`Failed to load URL: ${i} with error: ${t} (${o})`);
  }), e.webContents.on("console-message", (n, o, t, i, l) => {
    console.log(`[RENDERER-${["DEBUG", "INFO", "WARN", "ERROR"][o] || "LOG"}] ${t} (${l}:${i})`);
  }), d)
    e.loadURL(d);
  else {
    const n = s.join(process.env.DIST || "", "index.html");
    console.log(`Loading production index from: ${n}`), e.loadFile(n).catch((o) => {
      console.error("Failed to load file:", o);
    });
  }
  e.webContents.openDevTools();
}
p.on("set-ignore-mouse-events", (n, o) => {
  const t = a.fromWebContents(n.sender);
  t && t.setIgnoreMouseEvents(o, { forward: !0 });
});
p.handle("get-desktop-sources", async () => (await m.getSources({ types: ["window", "screen"], thumbnailSize: { width: 300, height: 300 } })).map((o) => ({
  id: o.id,
  name: o.name,
  thumbnail: o.thumbnail.toDataURL()
  // Send direct DataURL string
})));
r.on("window-all-closed", () => {
  process.platform !== "darwin" && (r.quit(), e = null);
});
r.on("activate", () => {
  a.getAllWindows().length === 0 && u();
});
r.on("certificate-error", (n, o, t, i, l, c) => {
  n.preventDefault(), c(!0);
});
r.whenReady().then(u);
