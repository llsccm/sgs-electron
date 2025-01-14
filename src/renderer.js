function buttonInit() {
  var max = document.getElementById('max')
  if (max) {
    max.addEventListener('click', () => {
      //发送最大化命令
      sendMsg('window-max')
      //最大化图形切换
      if (max.getAttribute('name') == 'max') {
        max.setAttribute('name', 'min')
      } else {
        max.setAttribute('name', 'max')
      }
      if (max.getAttribute('name') == 'max') {
        max.setAttribute('src', './res/button_05.png')
      } else {
        max.setAttribute('src', './res/button_01.png')
      }
    })

    max.addEventListener('mousemove', () => {
      //最大化图形切换
      if (max.getAttribute('name') == 'max') {
        max.setAttribute('src', './res/button_06.png')
      } else {
        max.setAttribute('src', './res/button_02.png')
      }
    })
    max.addEventListener('mouseout', () => {
      if (max.getAttribute('name') == 'max') {
        max.setAttribute('src', './res/button_05.png')
      } else {
        max.setAttribute('src', './res/button_01.png')
      }
    })
  }

  var min = document.getElementById('min')
  if (min) {
    min.addEventListener('click', () => {
      //发送最小化命令
      sendMsg('window-min')
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
          sendMsg('window-close')
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
    sub: [
      {
        text: '1',
        events: {
          click: () => {
            sendMsg('createWindow', 1)
          }
        }
      },
      {
        text: '2',
        events: {
          click: () => {
            sendMsg('createWindow', 2)
          }
        }
      },
      {
        text: '3',
        events: {
          click: () => {
            sendMsg('createWindow', 3)
          }
        }
      },
      {
        text: '4',
        events: {
          click: () => {
            sendMsg('createWindow', 4)
          }
        }
      },
      {
        text: '5',
        events: {
          click: () => {
            sendMsg('createWindow', 5)
          }
        }
      },
      {
        text: '6',
        events: {
          click: () => {
            sendMsg('createWindow', 6)
          }
        }
      },
      {
        text: '7',
        events: {
          click: () => {
            sendMsg('createWindow', 7)
          }
        }
      },
      {
        text: '8',
        events: {
          click: () => {
            sendMsg('createWindow', 8)
          }
        }
      }
    ]
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
    events: {
      click: () => {
        msgList.loadingxiaochao()
      }
    }
  },
  {
    text: '开启缓存',
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

window.addEventListener('load', function () {
  const menu = new cMenu(menutTemplate)
  document.getElementById('cmenu').addEventListener(
    'click',
    function (e) {
      menu.toggle(e)
    },
    false
  )
})

loadElectronFrame()

function channel(packageId) {
  cxDialog({
    title: '提示',
    info: '页面将会刷新',
    maskClose: true,
    ok: () => {
      msgList['channel'](packageId)
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
