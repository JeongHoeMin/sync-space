const { contextBridge, ipcRenderer } = require('electron');

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  onMessage: (callback: (msg: string) => void) => ipcRenderer.on('main-process-message', (_event: any, value: string) => callback(value)),
});
