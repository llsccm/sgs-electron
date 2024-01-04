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
loadElectronFrame()
