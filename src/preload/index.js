const { contextBridge, ipcRenderer } = require('electron')

const initPromise = ipcRenderer.invoke('get-window-data').then((data) => {
  return data
})

const loadElectronFrame = () => initPromise

function sendMsg(msg, ...arg) {
  ipcRenderer.send(msg, ...arg)
}

contextBridge.exposeInMainWorld('electronAPI', {
  loadElectronFrame,
  sendMsg,
  onMessage: (callback) => {
    const subscription = (event, msg, param) => callback(msg, param)
    ipcRenderer.on('rendererMsg', subscription)
    return () => ipcRenderer.removeListener('rendererMsg', subscription)
  }
})
