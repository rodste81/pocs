const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clclMenu', {
  onShow: (fn) => ipcRenderer.on('menu:show', (_e, model) => fn(model)),
  shown: (token) => ipcRenderer.send('menu:shown', token),
  onClear: (fn) => ipcRenderer.on('menu:clear', () => fn()),
  cleared: () => ipcRenderer.send('menu:cleared'),
  choose: (id, copyOnly) => ipcRenderer.send('menu:choose', id, copyOnly),
  chooseMany: (ids, copyOnly) => ipcRenderer.send('menu:chooseMany', ids, copyOnly),
  close: () => ipcRenderer.send('menu:close'),
});
