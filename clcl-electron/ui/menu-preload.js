const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clclMenu', {
  onShow: (fn) => ipcRenderer.on('menu:show', (_e, model) => fn(model)),
  shown: () => ipcRenderer.send('menu:shown'),
  onClear: (fn) => ipcRenderer.on('menu:clear', () => fn()),
  cleared: () => ipcRenderer.send('menu:cleared'),
  choose: (id, copyOnly) => ipcRenderer.send('menu:choose', id, copyOnly),
  close: () => ipcRenderer.send('menu:close'),
});
