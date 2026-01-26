/**
 * 统一管理 config.json 的访问
 * 配置文件存储在用户数据目录下
 */
const { app } = require('electron')
const path = require('path')

const configPath = path.join(app.getPath('userData'), 'config.json')
const config = require('electron-json-config').factory(configPath)

module.exports = config
