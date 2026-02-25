const { contextBridge, ipcRenderer } = require('electron');

// Expõe funções seguras para o renderer (frontend)
contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow:  () => ipcRenderer.send('window-minimize'),
  maximizeWindow:  () => ipcRenderer.send('window-maximize'),
  closeWindow:     () => ipcRenderer.send('window-close'),
  isElectron: true,
});
