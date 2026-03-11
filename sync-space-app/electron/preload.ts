import { contextBridge, ipcRenderer } from 'electron';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  onMessage: (callback: (msg: string) => void) => ipcRenderer.on('main-process-message', (_event, value) => callback(value)),
});
