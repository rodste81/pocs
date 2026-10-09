const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clcl', {
  getItems: () => ipcRenderer.invoke('search:items'),
  choose: (id, copyOnly) => ipcRenderer.send('search:choose', id, copyOnly),
  close: () => ipcRenderer.send('search:close'),
  onShow: (fn) => ipcRenderer.on('search:show', () => fn()),
});
