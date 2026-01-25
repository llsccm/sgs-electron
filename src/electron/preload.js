const { contextBridge, ipcRenderer } = require('electron')

let partition = 1

const initPromise = ipcRenderer.invoke('get-window-data').then((data) => {
  partition = data.partition
  packageId = data.packageId
  return data
})

async function loadElectronFrame() {
  const data = await initPromise
  initFrame()
  return data
}

function sendMsg(msg, ...arg) {
  ipcRenderer.send(msg, ...arg)
}

ipcRenderer.on('resize', (e, msg) => {
  console.log('接收', msg)
})

contextBridge.exposeInMainWorld('electronAPI', {
  loadElectronFrame,
  sendMsg,
  onMessage: (callback) => {
    const subscription = (event, msg, param) => callback(msg, param)
    ipcRenderer.on('rendererMsg', subscription)
    return () => ipcRenderer.removeListener('rendererMsg', subscription)
  }
})

function initFrame() {
  console.log('初始化')
  let WDVerTxt = document.getElementById('WDVerSion')
  WDVerTxt.innerHTML = document.title = '三国杀' + partition

  WDVerTxt.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault()
      ipcRenderer.send('menu')
    },
    false
  )
}
