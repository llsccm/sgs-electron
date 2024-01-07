const { ipcRenderer, remote } = require('electron')
const partition = remote.getGlobal('partition')
const packageId = remote.getGlobal('PackageId')
const urlList = ['https://web.sanguosha.com/login/air/client/h5/index', 'https://web.sanguosha.com/login/air/client/h5/index', 'https://my.4399.com/yxsgs/wd-home', 'https://my.4399.com/yxsgs/wd-home', 'http://web.kuaiwan.com/kwsgsn/index.html', 'http://web.kuaiwan.com/kwsgsn/index.html', 'https://web.sanguosha.com/login/air/feihuo/client/index', 'https://web.sanguosha.com/login/air/feihuo/client/index', 'https://wan.baidu.com/microend?gameId=19793595', 'https://wan.baidu.com/microend?gameId=19793595']
let webview = null

function loadElectronFrame() {
  initElectronFrame()
}

function sendMsg(msg,...arg) {
  ipcRenderer.send(msg,...arg)
}

window.loadElectronFrame = loadElectronFrame
window.sendMsg = sendMsg

ipcRenderer.on('resize', (e, msg) => {
  console.log('接收', msg)
})

const msgList = {
  loadingDeck() {
    webview
      .executeJavaScript(
        `fetch("https://llsccm.github.io/sgstools/inject.js").then(resp => resp.text())
      .then(data => {
        let script = document.createElement('script')
        script.type = 'text/javascript'
        let src = document.createTextNode(data)
        script.appendChild(src)
        document.body.appendChild(script)
      })`
      )
      .then(() => {
        console.log('记牌器加载')
      })
  },
  changeSize() {
    webview
      .executeJavaScript(
        `if(window.SystemContext){
        window.SystemContext.GAME_MIN_WIDTH = 1100
        window.SystemContext.GAME_MIN_HEIGHT = 670
      }`
      )
      .then(() => {
        ipcRenderer.send('setBounds')
      })
  },
  channel(packageId) {
    webview.loadURL(urlList[packageId - 1])
  },
  executeJS(str) {
    webview.executeJavaScript(str)
  }
}
window.msgList = msgList
ipcRenderer.on('rendererMsg', (e, msg, param) => {
  msgList[msg](param)
})

window.onload = () => {
  console.log('window-onload:', partition)
  window.addEventListener('keyup', (e) => {
    if (e.key == 'F12') {
      webview.openDevTools({ mode: 'detach' })
    }
  })
}

function initElectronFrame() {
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
  webview = document.getElementById('wb')
  webview.partition = 'persist:sgs' + partition
  webview.src = urlList[packageId - 1]
  webview.addEventListener('dom-ready', execute)

  function execute() {
    console.log('dom-ready')
    webview.executeJavaScript(`
      window.WDVerSion = '1.0.0'
      console.info('--wd-- ', window.location)
      fetch('https://cas.dobest.cn/cas/logout?url=https%3A%2F%2Fweb.sanguosha.com%2Findex.html', {
        referrer: 'https://web.sanguosha.com/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: null,
        method: 'GET',
        mode: 'no-cors',
        credentials: 'include'
      })
        .then((response) => response.json())
        .catch((err) => console.log('退出登录'))
  
      if (window.location.pathname === '/login/air/client/h5/index') {
        const userProto = document.querySelector('#SGS_userProto')
        userProto.parentNode.classList.add('on')
        userProto.checked = !0
        const loginbtn = document.querySelector('#SGS_login-btn')
        loginbtn.removeAttribute('disabled')
        loginbtn.classList.remove('SGS_loginbtn-disable')
        console.log('加载密码管理')
        const login_form = document.querySelector('#SGS_login-form')
        let style = document.createElement('style')
        style.innerHTML =
          'ul{padding:0;list-style:none;margin:0}a{text-decoration:none}a:link{color:#000}a:active,a:hover{outline:0}.pass-root{position:relative;color:#000}.hidden{visibility:hidden;opacity:0;height:0}.pass-root .more{width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:10px solid #fff}#manager{position:absolute;left:-180px;top:20px;width:192px;padding-top:5px;box-sizing:border-box;background-color:#fff;border-radius:5px;max-height:300px;overflow:auto;transition:all 1s}#manager::-webkit-scrollbar{height:12px;width:16px;background:rgba(0,0,0,.06);z-index:12;overflow:visible}#manager::-webkit-scrollbar-thumb{width:10px;background-color:#434953;border-radius:10px;z-index:12;border:4px solid transparent;background-clip:padding-box;transition:background-color .32s ease-in-out;margin:4px;min-height:32px;min-width:32px}#manager::-webkit-scrollbar-thumb:hover{background-color:#4e5157}#manager::-webkit-scrollbar-corner{background:#202020}#manager_add{display:block;margin-top:5px;padding:6px;border-top:1px solid #bfcfe4}.manager_account{display:flex;flex-direction:column;align-items:stretch;justify-content:center}.manager_account li{padding:4px 10px}.manager_account li:hover .button--danger{display:inline-block}#manager_add:hover,.manager_account li:hover{background-color:#ddd;border-radius:4px}.button--danger{display:none;float:right;box-sizing:border-box;border-radius:4px;color:#fff;background-color:#f56c6c;border:1px solid #f56c6c;cursor:pointer}li span{cursor:pointer}'
        document.getElementsByTagName('head')[0].appendChild(style)
        let div = document.createElement('div')
        div.innerHTML = '<div class="pass-root"><div class="more"></div><div id="manager" class="hidden"><ul class="manager_account"></ul><a id="manager_add" href="javascript:;">添加当前账号</a></div></div>'
        div.style.float = 'left'
        div.style.position = 'absolute'
        div.style.left = '270px'
        div.style.top = '54px'
        login_form.appendChild(div)
        const account = document.querySelector('#SGS_login-account')
        const password = document.querySelector('#SGS_login-password')
        const manager = document.querySelector('#manager')
        const ul = document.querySelector('.manager_account')
        account.spellcheck = false
        function getData() {
          let data = window.localStorage.getItem('managerData')
          if (data != null) {
            return JSON.parse(data)
          } else {
            return []
          }
        }
        function saveData(list) {
          window.localStorage.setItem('managerData', JSON.stringify(list))
        }
        function load() {
          ul.innerHTML = ''
          if (userlist) {
            userlist.forEach((item, index) => {
              let li = document.createElement('li')
              li.dataset.index = index
              li.innerHTML = '<span data-index="' + index + '">' + item.account + '</span><button class="button--danger" data-index="' + index + '">X</button>'
              li.addEventListener('click', clickCb)
              ul.appendChild(li)
            })
          }
        }
        function remove(index) {
          userlist.splice(index, 1)
          saveData(userlist)
          load()
        }
        function clickCb(e) {
          const target = e.target
          switch (target.nodeName) {
            case 'LI':
            case 'SPAN':
              auto(target)
              break
            case 'BUTTON':
              remove(target.dataset.index)
              break
            default:
              break
          }
          function auto(target) {
            account.value = userlist[target.dataset.index].account
            password.value = userlist[target.dataset.index].password
            manager.classList.toggle('hidden')
            userProto.checked = !0
            userProto.parentNode.classList.add('on')
            loginbtn.removeAttribute('disabled')
            loginbtn.classList.remove('SGS_loginbtn-disable')
          }
        }
        document.querySelector('#manager_add').addEventListener('click', () => {
          let account = document.querySelector('#SGS_login-account').value
          let password = document.querySelector('#SGS_login-password').value
          if (!account) return
          userlist.push({ account, password })
          saveData(userlist)
          load()
          setTimeout(() => {
            manager.classList.toggle('hidden')
          }, 1000)
        })
        document.querySelector('.more').addEventListener('click', () => {
          manager.classList.toggle('hidden')
        })
        let userlist = getData()
        load()
      }
    `)
  }
}
