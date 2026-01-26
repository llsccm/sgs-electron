const urlList = [
  'https://web.sanguosha.com/login/air/client/h5/index',
  'https://web.sanguosha.com/login/air/client/h5/index',
  'https://my.4399.com/yxsgs/wd-home',
  'https://my.4399.com/yxsgs/wd-home',
  'http://web.kuaiwan.com/kwsgsn/index.html',
  'http://web.kuaiwan.com/kwsgsn/index.html',
  'https://web.sanguosha.com/login/air/feihuo/client/index',
  'https://web.sanguosha.com/login/air/feihuo/client/index',
  'https://wan.baidu.com/microend?gameId=19793595',
  'https://wan.baidu.com/microend?gameId=19793595'
]

const webview = document.getElementById('wb')

const msgList = {
  loadingDeck() {
    if (!webview) return
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
    if (!webview) return
    webview
      .executeJavaScript(
        `if(window.SystemContext){
        window.SystemContext.GAME_MIN_WIDTH = 1100
        window.SystemContext.GAME_MIN_HEIGHT = 670
      }`
      )
      .then(() => {
        window.electronAPI.sendMsg('setBounds')
      })
  },
  channel(pid) {
    if (!webview) return
    webview.loadURL(urlList[pid - 1])
  },
  executeJS(str) {
    if (!webview) return
    webview.executeJavaScript(str)
  },
  // 查询缓存大小
  getCacheSize() {
    if (!webview) return
    const id = webview.getWebContentsId()
    window.electronAPI.sendMsg('getCacheSize', id)
  },
  // 消息回调
  cacheSize(data) {
    clearCache(data)
  },
  // 清理缓存
  clearCache() {
    if (!webview) return
    const id = webview.getWebContentsId()
    window.electronAPI.sendMsg('clearCache', id)
  },
  loadingxiaochao() {
    if (!webview) return
    webview
      .executeJavaScript(
        `fetch("https://www.desuwa.link/sgs/daxiaochao.user.js").then(resp => resp.text())
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
  openCache() {
    if (!webview) return
    webview.executeJavaScript(`fetch('https://www.desuwa.link/sgs/workerloader.js')
  .then((response) => response.text())
  .then((scriptText) => {
    const blob = new Blob([scriptText], { type: 'application/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    const worker = new Laya.Browser.window['Worker'](blobUrl)
    worker.onmessage = Laya.WorkerLoader.I.worker.onmessage
    Laya.WorkerLoader.I.worker = worker
    addTooltip('缓存已开启', 'acTooltip', 1500, 'green')
  })`)
  }
}

function buttonInit() {
  var min = document.getElementById('min')
  if (min) {
    min.addEventListener('click', () => {
      window.electronAPI.sendMsg('window-min')
    })
  }

  var close = document.getElementById('close')
  if (close) {
    close.addEventListener('click', () => {
      cxDialog({
        title: '提示',
        info: '是否确定退出游戏',
        maskClose: true,
        ok: () => {
          cleanup()
          window.electronAPI.sendMsg('window-close')
        },
        no: () => {}
      })
    })
  }
}

buttonInit()

const menutTemplate = [
  {
    text: '新建窗口',
    sub: Array.from({ length: 8 }, (_, i) => ({
      text: String(i + 1),
      events: {
        click: () => {
          window.electronAPI.sendMsg('createWindow', i + 1)
        }
      }
    }))
  },
  {
    text: '跳转页面',
    sub: [
      {
        text: 'ol',
        events: {
          click: () => {
            channel(1)
          }
        }
      },
      {
        text: '4399',
        events: {
          click: () => {
            channel(3)
          }
        }
      },
      {
        text: '百度',
        events: {
          click: () => {
            channel(9)
          }
        }
      }
    ]
  },
  {
    text: '加载小抄',
    selectable: true,
    events: {
      click: () => {
        msgList.loadingxiaochao()
      }
    }
  },
  {
    text: '开启缓存',
    selectable: true,
    events: {
      click: () => {
        msgList.openCache()
      }
    }
  },
  {
    text: '清除缓存',
    events: {
      click: () => {
        msgList.getCacheSize()
      }
    }
  },
  {
    type: 'cm-divider',
    text: '关闭菜单'
  }
]

const menu = new cMenu(menutTemplate)

window.onload = () => {
  window.addEventListener('keyup', (e) => {
    if (e.key == 'F12') {
      if (webview) webview.openDevTools({ mode: 'detach' })
    }
  })

  document.getElementById('cmenu').addEventListener(
    'click',
    function (e) {
      menu.toggle(e)
    },
    false
  )
}

function channel(packageId) {
  cxDialog({
    title: '提示',
    info: '页面将会刷新',
    maskClose: true,
    ok: () => {
      msgList['channel'](packageId)
      menu.init(menutTemplate)
    },
    no: () => {}
  })
}

function clearCache(data) {
  const size = (data / 1024 / 1024).toFixed(2)
  cxDialog({
    title: '提示',
    info: `缓存大小为${size}MB,是否清除缓存`,
    maskClose: true,
    ok: () => {
      msgList['clearCache']()
    },
    no: () => {}
  })
}

const cleanup = window.electronAPI.onMessage((msg, param) => {
  if (msgList[msg]) {
    msgList[msg](param)
  }
})

window.electronAPI.loadElectronFrame().then((data) => {
  console.log('初始化')

  const { partition, packageId } = data
  const WDVerTxt = document.getElementById('WDVerSion')
  WDVerTxt.innerHTML = document.title = '三国杀' + partition

  WDVerTxt.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault()
      window.electronAPI.sendMsg('menu')
    },
    false
  )

  webview.partition = 'persist:sgs' + partition
  webview.src = urlList[packageId - 1]
})

webview.addEventListener('dom-ready', execute)

function execute() {
  const id = webview.getWebContentsId()
  console.log('WebContents ID:', id)
}
