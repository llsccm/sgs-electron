const { ipcRenderer, remote, } = require('electron')
//const shell = remote.require('shell')
const W = remote.getCurrentWindow()
const view = W.getBrowserView()
const package = remote.getGlobal('package')

function loadElectronFrame() {
  initElectronFrame()
}

window.loadElectronFrame = loadElectronFrame

ipcRenderer.on('mainSendToRender', (e, arg) => {
  console.log(arg)
  // ipcRenderer.send('test', arg)
})

function initElectronFrame() {

  var close = document.getElementById('close')
  if (close) {
    close.addEventListener('click', () => {
      W.close()
    })
  }

  let WDVerTxt = document.getElementById('WDVerSion')
  WDVerTxt.innerHTML = '三国杀'
  // WDVerTxt.addEventListener('click', () => {
  //   console.log('click')
  //   ipcRenderer.send('createWindow')
  // })

  ipcRenderer.send('test', 'render')

  let loginURL = package.LoginURL
  let loginForm = package.packageId
  view.webContents.loadURL(loginURL[loginForm - 1])

  view.webContents.on('dom-ready', () => {
    console.log('dom-ready')
    view.webContents.executeJavaScript(`
        window.WDVerSion =  "1.0.0"
        console.info('--wd --> ', window.location)
          fetch("https://cas.dobest.cn/cas/logout?url=https%3A%2F%2Fweb.sanguosha.com%2Findex.html", {
            "referrer": "https://web.sanguosha.com/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "no-cors",
            "credentials": "include"
          }).then(response => response.json())
            .catch(err => console.log('退出登录'))
    `)
  })
}
