// Modules to control application life and create native browser window
const { app, shell, BrowserWindow } = require('electron')
//const { crashReporter } = require('electron')
const ipcEvent = require('./electron/ipcEvent')
const createWindow = require('./electron/window')
const interceptor = require('./electron/interceptor')
//app.commandLine.appendSwitch("--disable-http-cache");
// app.commandLine.appendSwitch('--no-sandbox')
app.commandLine.appendSwitch('--enable-webgl')
app.commandLine.appendSwitch('ignore-gpu-blacklist')
// 中文环境下不能替换字体
app.commandLine.appendSwitch('lang', 'en')
// app.allowRendererProcessReuse = false

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    createWindow()
  })
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
  console.log('quit')
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('web-contents-created', (e, webContents) => {
  webContents.on('new-window', (event, url) => {
    event.preventDefault()
    if (url.startsWith('http')) {
      shell.openExternal(url).catch((e) => {
        console.log(e)
      })
    }
  })
})

app.whenReady().then(() => {
  interceptor()
  ipcEvent.init()
  createWindow(1)
})
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
})
