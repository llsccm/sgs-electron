const { BrowserWindow } = require('electron')
const path = require('path')
const group = new Map()
global.partition = 1

function createElectronWindow(index) {
  // Create the browser window.
  let partition = index
  global.partition = partition
  let x, y
  const currentWindow = BrowserWindow.getFocusedWindow()
  if (currentWindow) {
    const [curWndX, curWndY] = currentWindow.getPosition()
    x = curWndX + 25
    y = curWndY + 25
  }
  console.log('createWindow:', partition)
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
      // nodeIntegration: true,
      // webSecurity: false,
      contextIsolation: false, //12之后需要设置
      enableRemoteModule: true,
      nativeWindowOpen: true, //是否使用原生的window.open()
      plugins: true, //是否支持插件
      sandbox: true, //沙盒选项,这个很重要
      preload: path.join(__dirname, './preload.js')
      // allowRunningInsecureContent: true,
      // allowDisplayingInsecureContent :true
    }
  })
  mainWindow.loadFile(path.join(__dirname,'../index.html'))
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
    mainWindow = null
  })

  // mainWindow.webContents.on('crashed', function () {
  //   console.log('crashed')
  //   //crashReporter.addExtraParameter("whlie", "main");
  // })

  // mainWindow.webContents.on('resize', function () {
  //   console.log('win resize')
  //   // mainWindow.webContents.send('resize', 1)
  //   //crashReporter.addExtraParameter("whlie", "main");
  // })

  // 屏蔽窗口菜单（-webkit-app-region: drag）
  mainWindow.hookWindowMessage(278, function (e) {
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
