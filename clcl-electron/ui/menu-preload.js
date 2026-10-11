const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clclMenu', {
  onShow: (fn) => ipcRenderer.on('menu:show', (_e, model) => fn(model)),
  shown: () => ipcRenderer.send('menu:shown'),
  choose: (id, copyOnly) => ipcRenderer.send('menu:choose', id, copyOnly),
  close: () => ipcRenderer.send('menu:close'),
});
