const { ipcMain, dialog } = require('electron')

ipcMain.on('render-main', (event) => {
    const options = {
        title: '打开文件对话框',
    }
    dialog.showOpenDialog(options)
})

ipcMain.on('render-main-1', (event) => {
    // 异步返回
    event.sender.send('asyn-back', '异步返回的消息：aaa');
})

ipcMain.on('render-main-2', (event) => {
    // 同步返回
    event.returnValue = '同步返回的消息：bbb'
})

ipcMain.on('set-globle', (event, msg) => {
    global.globle_name = msg;
})

ipcMain.on('render-main-crash', (event) => {
    process.crash();
})


