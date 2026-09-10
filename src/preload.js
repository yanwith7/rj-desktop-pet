const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopPet', {
  hide: () => ipcRenderer.invoke('pet:hide'),
  show: () => ipcRenderer.invoke('pet:show'),
  quit: () => ipcRenderer.invoke('pet:quit'),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('pet:toggle-always-on-top', enabled),
  getAutoStart: () => ipcRenderer.invoke('pet:get-autostart'),
  setAutoStart: (enabled) => ipcRenderer.invoke('pet:set-autostart', enabled),
  setLocale: (locale) => ipcRenderer.invoke('pet:set-locale', locale),
  moveWindow: (dx, dy) => ipcRenderer.invoke('pet:move-window', dx, dy),
  resizeWindow: (width, height) => ipcRenderer.invoke('pet:resize-window', width, height)
});
