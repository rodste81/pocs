const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clclEditor', {
  load: () => ipcRenderer.invoke('editor:load'),
  save: (root) => ipcRenderer.send('editor:save', root),
  clipboardText: () => ipcRenderer.invoke('editor:clipboard'),
  onReload: (fn) => ipcRenderer.on('editor:reload', () => fn()),
  onSelect: (fn) => ipcRenderer.on('editor:select', (_e, path) => fn(path)),
});
