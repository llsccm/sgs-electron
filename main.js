// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, shell, session } = require('electron')
const fs = require('fs')
//const { crashReporter } = require('electron')
const path = require('path')
const package = require('./package.json')

//app.commandLine.appendSwitch("--disable-http-cache");
app.commandLine.appendSwitch('--no-sandbox')
app.commandLine.appendSwitch('--enable-webgl')
app.commandLine.appendSwitch('ignore-gpu-blacklist')
app.allowRendererProcessReuse = false

global.LoginURL = package.LoginURL
global.partition = 1
const group = new Map()
let MAIN = null
let config = {}
let afterjs = false
const programDir = path.dirname(app.getPath('exe')) // 程序目录
const configPath = path.join(programDir, 'config.json') // 配置文件
const pluginPath = path.join(programDir, '/resources/plugin.json')

function readConfig() {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath)) || {}
  }
  const afterPath = path.join(programDir, '/resources/after.js')
  if (!fs.existsSync(afterPath)) return
  afterjs = true
  if (fs.existsSync(pluginPath)) {
    const obj = JSON.parse(fs.readFileSync(pluginPath))
    global.plugins = obj.plugins || []
  }
}
readConfig()
global.PackageId = config.packageId || package.packageId

function createWindow() {
  // Create the browser window.
  let x, y
  const currentWindow = BrowserWindow.getFocusedWindow()
  if (currentWindow) {
    const [curWndX, curWndY] = currentWindow.getPosition()
    x = curWndX + 25
    y = curWndY + 25
  }
  console.log('createWindow')
  let mainWindow = new BrowserWindow({
    width: 1220,
    height: 762,
    frame: false,
    resizable: true,
    titleBarStyle: 'customButtonOnHover',
    show: false,
    x,
    y,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      webSecurity: false,
      contextIsolation: false, //12之后需要设置
      enableRemoteModule: true,
      nativeWindowOpen: true, //是否使用原生的window.open()
      plugins: true, //是否支持插件
      sandbox: true, //沙盒选项,这个很重要
      preload: path.join(app.getAppPath(), './script/electron_frame.js')
      // allowRunningInsecureContent: true,
      // allowDisplayingInsecureContent :true
    }
  })
  mainWindow.loadFile('./index_wd.html')
  //mainWindow.loadFile('./index_wd.html');
  // let devtools = new BrowserWindow();
  // mainWindow.webContents.setDevToolsWebContents(devtools.webContents)
  // mainWindow.webContents.openDevTools()

  if (!MAIN) MAIN = mainWindow
  group.set(partition, true)

  mainWindow.once('ready-to-show', function () {
    mainWindow.show()
  })
  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    console.log('closed1')
    if (MAIN === mainWindow) MAIN = null
    mainWindow = null
  })

  mainWindow.webContents.on('crashed', function () {
    console.log('crashed')
    //crashReporter.addExtraParameter("whlie", "main");
  })

  mainWindow.webContents.on('resize', function () {
    console.log('win resize')
    mainWindow.webContents.send('resize', 1)
    //crashReporter.addExtraParameter("whlie", "main");
  })

  // 屏蔽窗口菜单（-webkit-app-region: drag）
  mainWindow.hookWindowMessage(278, function (e) {
    mainWindow.setEnabled(false)
    setTimeout(() => {
      mainWindow.setEnabled(true)
    }, 100)
    return true
  })
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    for (let index = 1; index <= 8; index++) {
      if (!group.has(index)) {
        partition = index
        createWindow()
        return
      }
    }
  })
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

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
  if (MAIN === null) createWindow()
})

app.on('web-contents-created', (e, webContents) => {
  webContents.on('new-window', (event, url) => {
    event.preventDefault()
    shell.openExternal(url)
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
})
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// 通过main进程发送事件给renderer进程，提示更新信息
function sendUpdateMessage(text) {
  MAIN.webContents.send('message', text)
}

ipcMain.on('createWindow', function (event, obj) {
  partition = obj.partition
  createWindow()
})

ipcMain.on('window-close', function (event, partition) {
  group.delete(partition)
})

ipcMain.on('area', function (event, packageId) {
  fs.writeFileSync(configPath, JSON.stringify({ packageId }))
})
