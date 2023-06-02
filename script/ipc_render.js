const { ipcRenderer } = require('electron')
const remote = require('electron').remote;
const BrowserWindow = remote.BrowserWindow;
const crashReporter = remote.crashReporter;

crashReporter.start({
    productName: 'Lyf',
    companyName: 'Yoka',
    submitURL: 'https://128.0.0.1:1127/post',
    uploadToServer: true
})


var open_dialog = document.getElementById("render")
var save_dialog = document.getElementById("main")
var mail1 = document.getElementById("3")
var mail2 = document.getElementById("4");
var mail5 = document.getElementById("5");
var mail6 = document.getElementById("6");
var mail7 = document.getElementById("7");
var mail8 = document.getElementById("8");
open_dialog.onclick = function () {
    ipcRenderer.send('render-main')
}

save_dialog.onclick = function () {
    ipcRenderer.send('main-render')
}

ipcRenderer.on('list', (e, msg) => {
    alert(msg)
});

mail1.onclick = function () {
    ipcRenderer.send('render-main-1');
}

mail2.onclick = function () {
    let a = ipcRenderer.sendSync('render-main-2');
    alert(a);
}

mail5.onclick = function () {
    var win = new BrowserWindow({ width: 800, height: 600 });
    win.loadURL('https://baidu.com');
}

mail6.onclick = function (event, msg) {
    ipcRenderer.send('set-globle', '李');
}
mail7.onclick = function () {
    alert(remote.getGlobal('globle_name'));
}

ipcRenderer.on('asyn-back', (event, arg) => {
    alert(arg);
})

mail8.onclick = function () {
    ipcRenderer.send('render-main-crash')
}

