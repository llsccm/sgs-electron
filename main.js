// Modules to control application life and create native browser window
const { app, shell, session } = require('electron')
//const { crashReporter } = require('electron')
const path = require('path')
const fs = require('fs')
const ipcEvent = require('./src/electron/ipcEvent')
const createWindow = require('./src/electron/window')
const programDir = path.dirname(app.getPath('exe')) // 程序目录
let afterjs = false

//app.commandLine.appendSwitch("--disable-http-cache");
// app.commandLine.appendSwitch('--no-sandbox')
app.commandLine.appendSwitch('--enable-webgl')
app.commandLine.appendSwitch('ignore-gpu-blacklist')
// 中文环境下不能替换字体
app.commandLine.appendSwitch('lang','en')
app.allowRendererProcessReuse = false

function configInit() {
  const afterPath = path.join(programDir, '/resources/after.js')
  if (!fs.existsSync(afterPath)) return
  afterjs = true
}
configInit()

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
  console.log('activate')
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  createWindow()
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
  const filter = {
    urls: ['*://web.sanguosha.com/*'] // 要拦截的地址
  }
  const ses = session.fromPartition('persist:sgs1')
  //注册自定义协议并拦截基于现有协议的请求
  ses.protocol.registerFileProtocol('atom', (request, callback) => {
    const url = request.url.replace('atom://', '')
    const filePath = path.join(programDir, `/resources/${url}`)
    callback({ path: filePath })
  })
  ses.webRequest.onBeforeRequest(filter, (details, callback) => {
    // details.url返回的是上面filter.urls里需要拦截的所有接口
    // console.log(details.url)
    if (details.url.includes('web.sanguosha.com/220/h5_2/libs/after.js') && afterjs) {
      callback({
        // redirectURL使用自定义的atom协议
        redirectURL: 'atom://after.js'
      })
    } else {
      callback({ requestHeaders: details.requestHeaders })
    }
  })
  createWindow(1)
})
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcEvent.init()

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
})
