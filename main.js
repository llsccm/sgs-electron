// electron 模块可以用来控制应用的生命周期和创建原生浏览窗口
const { app, BrowserWindow, BrowserView, ipcMain, shell } = require('electron')
const path = require('path')
const package = require('./package.json')
global.package = package

app.commandLine.appendSwitch('--no-sandbox')
app.commandLine.appendSwitch('--enable-webgl')
app.commandLine.appendSwitch('ignore-gpu-blacklist')

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    createWindow()
    return
  })
}

const createWindow = () => {
  // 创建浏览窗口
  // console.log("createWindow")
  let mainWindow = new BrowserWindow({
    width: 1230,
    height: 670,
    frame: false,
    resizable: false,
    titleBarStyle: 'customButtonsOnHover',
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
    }
  })

  // 加载 index.html
  mainWindow.loadFile('./index.html')

  let view = new BrowserView()
  // console.log('#', view.webContents)
  mainWindow.setBrowserView(view)
  view.setBounds({ x: 0, y: 30, width: 1230, height: 640 })
  view.setAutoResize({ width: true, height: true })

  mainWindow.on('close', () => {
    console.log('close')
    view.webContents.destroy()
    view = null
  })

  mainWindow.on('closed', () => {
    console.log('closed')
    mainWindow = null
  })

  // 打开开发工具
  // mainWindow.webContents.openDevTools({ mode: 'detach' })
  // view.webContents.openDevTools({ mode: 'detach' })
}

// 这段程序将会在 Electron 结束初始化
// 和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // 在 macOS 系统内, 如果没有已开启的应用窗口
    // 点击托盘图标时通常会重新创建一个新窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此, 通常
// 对应用程序和它们的菜单栏来说应该时刻保持激活状态,
// 直到用户使用 Cmd + Q 明确退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('web-contents-created', (e, webContents) => {
  webContents.on('new-window', (event, url) => {
    //console.log('new-window')
    event.preventDefault()
    shell.openExternal(url)
  })
})

// 在当前文件中你可以引入所有的主进程代码
// 也可以拆分成几个文件，然后用 require 导入。
ipcMain.on('test', (event, arg) => {
  console.log(arg)
})

ipcMain.on('createWindow', () => {
  console.log('newWindow')
  createWindow()
})
