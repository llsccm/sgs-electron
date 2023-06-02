const { ipcRenderer } = require('electron')
const { dialog } = require('electron').remote;

dialog.showMessageBox({
    type: "info",//图标类型
    title: "更新",//信息提示框标题
    message: "正在检测更新",//信息提示框内容
    // buttons: ["前往作者博客", "取消"],//下方显示的按钮
    // icon:nativeImage.createFromPath("./icon/search-globe.png"),//图标
    // cancelId:2//点击x号关闭返回值
})
ipcRenderer.send("checkForUpdate");

ipcRenderer.on("message", (event, text) => {
    console.log(arguments);
    this.tips = text;

    dialog.showMessageBox({
        type: "info",//图标类型
        title: "更新",//信息提示框标题
        message: this.tips//信息提示框内容
    })
});
ipcRenderer.on("downloadProgress", (event, progressObj) => {
    console.log(progressObj);
    this.downloadPercent = progressObj.percent || 0;
    dialog.showMessageBox({
        type: "info",//图标类型
        title: "更新",//信息提示框标题
        message: "下载进度" +this.downloadPercent //信息提示框内容
    })
});
ipcRenderer.on("isUpdateNow", () => {
    dialog.showMessageBox({
        type: "info",//图标类型
        title: "帮助",//信息提示框标题
        message: "lyf下载完成，是否开始更新程序",//信息提示框内容
        buttons: ["更新"],//下方显示的按钮
    }, function (index) {
        if(index==0){
            ipcRenderer.send("isUpdateNow");
        }
    })
    //
});

