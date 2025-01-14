const { app, BrowserWindow, ipcMain, dialog, Menu, webContents } = require('electron')
const path = require('path')
const fs = require('fs')
const createWindow = require('./window')
const programDir = path.dirname(app.getPath('exe')) // 程序目录
const configPath = path.join(programDir, 'config.json') // 配置文件
const pluginPath = path.join(programDir, '/resources/plugin.json')
const config = require('electron-json-config').factory(configPath)
global.PackageId = config.get('packageId') || 1

// console.log(config.get('packageId'))

function changeChannel(window, packageId, isSave = false) {
  dialog
    .showMessageBox(window, {
      type: 'warning',
      title: '提示',
      message: '页面将会刷新',
      buttons: ['ok', 'cancel']
    })
    .then((data) => {
      if (data.response == 0) {
        if (isSave) config.set('packageId', packageId)
        window.webContents.send('rendererMsg', 'channel', packageId)
      }
    })
}

module.exports = {
  windowEventInit() {
    //
    ipcMain.on('window-close', function (e) {
      const win = BrowserWindow.fromWebContents(e.sender)
      win.close()
    })

    //接收最小化命令
    ipcMain.on('window-min', function (e) {
      const win = BrowserWindow.fromWebContents(e.sender)
      win.minimize()
    })

    //接收最大化命令
    ipcMain.on('window-max', function (e) {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (win.isMaximized()) {
        win.restore()
      } else {
        win.maximize()
      }
    })

    //
    ipcMain.on('setBounds', function (e) {
      const win = BrowserWindow.fromWebContents(e.sender)
      win.setBounds({ width: 1100, height: 700 })
    })

    ipcMain.on('createWindow', (e, index) => {
      createWindow(index)
    })

    ipcMain.on('getCacheSize', (e, id) => {
      const contents = webContents.fromId(id)
      contents.session.getCacheSize().then((size) => {
        e.sender.send('rendererMsg', 'cacheSize', size)
      })
    })

    ipcMain.on('clearCache', (e, id) => {
      const contents = webContents.fromId(id)
      contents.session.clearCache()
    })
  },
  menuEventInit() {
    ipcMain.on('menu', function (e) {
      const plugins = []
      const submenuArr = []
      const contents = e.sender
      const window = BrowserWindow.fromWebContents(contents)

      if (contents._partition == 1 || contents._partition == 2) pluginInit()

      const menuContextTemplate = [
        {
          label: '多开',
          submenu: [
            {
              label: '2',
              click: () => {
                createWindow(2)
              }
            },
            {
              label: '3',
              click: () => {
                createWindow(3)
              }
            },
            {
              label: '4',
              click: () => {
                createWindow(4)
              }
            },
            {
              label: '5',
              click: () => {
                createWindow(5)
              }
            },
            {
              label: '6',
              click: () => {
                createWindow(6)
              }
            },
            {
              label: '1',
              click: () => {
                createWindow(1)
              }
            }
          ]
        },
        {
          label: '跳转页面',
          submenu: [
            {
              label: 'ol',
              click: () => {
                changeChannel(window, 1)
              }
            },
            {
              label: '百度',
              click: () => {
                changeChannel(window, 9)
              }
            },
            {
              label: '4399',
              click: () => {
                changeChannel(window, 3)
              }
            }
          ]
        },
        {
          label: '切换配置',
          submenu: [
            {
              label: 'ol',
              click: () => {
                changeChannel(window, 1, true)
              }
            },
            {
              label: '百度',
              click: () => {
                changeChannel(window, 9, true)
              }
            },
            {
              label: '4399',
              click: () => {
                changeChannel(window, 3, true)
              }
            }
          ]
        },
        {
          label: '加载记牌器',
          click: () => {
            window.webContents.send('rendererMsg', 'loadingDeck')
          }
        },
        {
          label: '加载小抄',
          click: () => {
            window.webContents.send('rendererMsg', 'loadingxiaochao')
          }
        },
        {
          label: '更多插件',
          submenu: [
            {
              label: '修改尺寸',
              click: () => {
                contents.send('rendererMsg', 'changeSize')
                // contents.openDevTools()
              }
            },
            ...submenuArr
          ]
        }
      ]
      const menuBuilder = Menu.buildFromTemplate(menuContextTemplate)
      menuBuilder.popup({ window })

      function pluginInit() {
        if (fs.existsSync(pluginPath)) {
          const obj = JSON.parse(fs.readFileSync(pluginPath))
          plugins.push(...obj.plugins)

          plugins.forEach((item) => {
            submenuArr.push({
              label: item.name,
              click: () => {
                contents.send('rendererMsg', 'executeJS', item.scripts)
              }
            })
          })
        }
      }
    })
  },
  init() {
    this.windowEventInit()
    this.menuEventInit()
  }
}
