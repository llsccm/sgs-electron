// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, shell } = require('electron')
//const { crashReporter } = require('electron')
const path = require('path')

//app.commandLine.appendSwitch("--disable-http-cache");
app.commandLine.appendSwitch('--no-sandbox')
app.commandLine.appendSwitch('--enable-webgl')
app.commandLine.appendSwitch('ignore-gpu-blacklist')
// let mainWindow
const package = require('./package.json')
global.Version = package.version
global.IsTest = package.IsTest
global.PackageId = package.packageId
global.URLOffTest = package.URLOffTest
global.URLLYTest = package.URLLYTest
global.AutoUpdaterURL = package.AutoUpdaterURL
global.JumpURL = package.JumpURL
global.FeedURL = package.FeedURL
global.LoginURL = package.LoginURL
global.IsDebug = package.IsDebug
global.partition = 1
const group = new Map()
let MAIN = null
function createWindow() {
  // Create the browser window.
  let x, y
  const currentWindow = BrowserWindow.getFocusedWindow()
  if (currentWindow) {
    const [curWndX, curWndY] = currentWindow.getPosition();
    x = curWndX + 25
    y = curWndY + 25
  }
  console.log('createWindow')
  let mainWindow = new BrowserWindow({
    width: 1030,
    height: 670,
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
  //updateHandle();
  // ipcMain.on('main-render', (event) => {
  //   mainWindow.webContents.send('list', 'Main进程主动发送的消息')
  // })
  // //接收最小化命令
  // ipcMain.on('window-min', function (event, {w}) {
  //   w.minimize()
  // })
  // //接收最大化命令
  // ipcMain.on('window-max', function (event, {w}) {
  //   if (w.isMaximized()) {
  //     w.restore()
  //   } else {
  //     w.maximize()
  //   }
  // })
  // //接收关闭命令
  // ipcMain.on('window-close', function (event, {w}) {
  //   console.log('关闭游戏')
  //   dialog
  //     .showMessageBox(w, {
  //       type: 'warning',
  //       title: '提示',
  //       message: '是否确定退出游戏',
  //       buttons: ['ok', 'cancel']
  //     })
  //     .then((index) => {
  //       if (index.response == 0) {
  //         w.close()
  //       }
  //     })
  // })
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (MAIN) {
      if (MAIN.isMinimized()) MAIN.restore()
      MAIN.focus()
      for (let index = 1; index <= 8; index++) {
        if (!group.has(index)) {
          partition = index
          createWindow()
          return
        }
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// 通过main进程发送事件给renderer进程，提示更新信息
function sendUpdateMessage(text) {
  MAIN.webContents.send('message', text)
}

ipcMain.on('createWindow', function (event, obj) {
  partition = obj.partition
  // MAIN.webContents.send('create', 'Main进程主动发送的消息')
  createWindow()
})

ipcMain.on('window-close', function (event, partition) {
  group.delete(partition)
})
