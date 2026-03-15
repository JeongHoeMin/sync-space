const { contextBridge: n, ipcRenderer: s } = require("electron");
n.exposeInMainWorld("electronAPI", {
  setIgnoreMouseEvents: (e) => s.send("set-ignore-mouse-events", e),
  getDesktopSources: () => s.invoke("get-desktop-sources"),
  onMessage: (e) => s.on("main-process-message", (t, o) => e(o))
});
