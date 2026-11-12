const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clclImage', {
  load: () => ipcRenderer.invoke('imgedit:load'),
  save: (dataUrl) => ipcRenderer.invoke('imgedit:save', dataUrl),
  copy: (dataUrl) => ipcRenderer.invoke('imgedit:copy', dataUrl),
  email: (dataUrl) => ipcRenderer.invoke('imgedit:email', dataUrl),
  close: () => ipcRenderer.send('imgedit:close'),
  debug: (msg) => ipcRenderer.send('imgedit:debug', String(msg).slice(0, 400)),
});
