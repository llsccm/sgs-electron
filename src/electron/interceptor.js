const { app, session } = require('electron')
const path = require('path')
const fs = require('fs')
const programDir = path.dirname(app.getPath('exe')) // 程序目录
let afterjs = false
const filter = {
  urls: ['*://web.sanguosha.com/*'] // 要拦截的地址
}

function configInit() {
  const afterPath = path.join(programDir, '/resources/after.js')
  if (!fs.existsSync(afterPath)) return
  afterjs = true
}
configInit()

module.exports = function () {
  const ses = session.fromPartition('persist:sgs1')
  //注册自定义协议并拦截基于现有协议的请求
  ses.protocol.registerFileProtocol('atom', (request, callback) => {
    const url = request.url.replace('atom://', '')
    const filePath = path.join(programDir, `/resources/${url}`)
    callback({ path: filePath })
  })

  ses.webRequest.onBeforeRequest(filter, (details, callback) => {
    // details.url返回的是上面filter.urls里需要拦截的所有接口
    // console.log(details.url)
    if (details.url.includes('web.sanguosha.com/220/h5_2/libs/after.js') && afterjs) {
      callback({
        // redirectURL使用自定义的atom协议
        redirectURL: 'atom://after.js'
      })
    } else {
      callback({ requestHeaders: details.requestHeaders })
    }
  })
}
