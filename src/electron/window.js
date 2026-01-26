const { BrowserWindow } = require('electron')
const path = require('path')
const config = require('./config')
const group = new Map()

// Create the browser window.
function createElectronWindow(partition) {
  let x, y
  const currentWindow = BrowserWindow.getFocusedWindow()

  if (currentWindow) {
    const [curWndX, curWndY] = currentWindow.getPosition()
    x = curWndX + 25
    y = curWndY + 25
  }

  console.log('createWindow:', partition)

  // 读取保存的窗口尺寸，如果没有则使用默认值
  const savedWidth = config.get('windowWidth') || 1220
  const savedHeight = config.get('windowHeight') || 762

  const mainWindow = new BrowserWindow({
    width: savedWidth,
    height: savedHeight,
    frame: false,
    resizable: true,
    titleBarStyle: 'customButtonOnHover',
    show: false,
    x,
    y,
    webPreferences: {
      webviewTag: true,
      // nodeIntegration: true,
      // webSecurity: false,
      contextIsolation: true, //12之后需要设置
      nativeWindowOpen: true, //是否使用原生的window.open()
      plugins: true, //是否支持插件
      sandbox: true, //沙盒选项,这个很重要
      preload: path.join(__dirname, '../preload/index.js')
      // allowRunningInsecureContent: true,
      // allowDisplayingInsecureContent :true
    }
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  // let devtools = new BrowserWindow();
  // mainWindow.webContents.setDevToolsWebContents(devtools.webContents)
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents._partition = partition
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
    group.delete(partition)
    // mainWindow = null
  })

  // mainWindow.webContents.on('crashed', function () {
  //   console.log('crashed')
  //   //crashReporter.addExtraParameter("whlie", "main");
  // })

  // 12的api
  mainWindow.on('resized', function () {
    const [width, height] = mainWindow.getSize()
    config.set('windowWidth', width)
    config.set('windowHeight', height)
  })

  // 屏蔽窗口菜单（-webkit-app-region: drag）
  mainWindow.hookWindowMessage(278, function () {
    mainWindow.setEnabled(false)
    setTimeout(() => {
      mainWindow.setEnabled(true)
    }, 100)
    return true
  })

  // 中文环境有点bug
  mainWindow.webContents.on('will-attach-webview', (e, webPreferences) => {
    webPreferences.defaultFontFamily = {
      standard: 'MI Lan Pro VF Default',
      sansSerif: 'MI Lan Pro VF Default'
    }
    webPreferences.allowRunningInsecureContent = true
    webPreferences.spellcheck = false
  })
}

module.exports = function createWindow(partition) {
  if (!partition) {
    for (let i = 1; i <= 8; i++) {
      if (!group.has(i)) {
        createElectronWindow(i)
        break
      }
    }
  } else {
    createElectronWindow(partition)
  }
}
