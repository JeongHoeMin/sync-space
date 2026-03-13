const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send("set-ignore-mouse-events", ignore),
  getDesktopSources: () => ipcRenderer.invoke("get-desktop-sources"),
  onMessage: (callback) => ipcRenderer.on("main-process-message", (_event, value) => callback(value))
});
