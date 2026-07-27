const { app, session, net } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')

const programDir = app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath()

const resourceDir = path.join(programDir, 'resources')
const filter = {
  urls: ['*://web.sanguosha.com/*', '*://sdk.rum.aliyuncs.com/*']
}

const hasAfterJs = fs.existsSync(path.join(resourceDir, 'after.js'))
const hasBeforeJs = fs.existsSync(path.join(resourceDir, 'before.min.js'))

module.exports = function () {
  for (let i = 1; i <= 5; i++) {
    const ses = session.fromPartition(`persist:sgs${i}`)

    ses.protocol.handle('atom', (request) => {
      const relativePath = request.url.replace('atom://', '')
      const safePath = path.normalize(path.join(resourceDir, relativePath))
      return net.fetch(pathToFileURL(safePath).toString())
    })

    ses.webRequest.onBeforeRequest(filter, (details, callback) => {
      const { url } = details

      // 拦截并重定向
      if (hasAfterJs && url.includes('web.sanguosha.com/220/h5_2/libs/after.js')) {
        return callback({ redirectURL: 'atom://after.js' })
      }

      if (hasBeforeJs && url.includes('web.sanguosha.com/220/h5_2/libs/min/before.min.js')) {
        return callback({ redirectURL: 'atom://before.min.js' })
      }

      if (url.includes('sdk.rum.aliyuncs.com/v2/browser-sdk.js')) {
        return callback({ cancel: true })
      }

      callback({})
    })
  }
}
