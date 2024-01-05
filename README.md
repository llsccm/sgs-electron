## 三国杀online 微端

基于三国杀官方微端，新增部分功能

### 特性

- 账号密码管理
- 窗口多开互不影响
- 去除自动更新
- 界面精简
- 支持记牌器
- 修改游戏最小尺寸
- 修改默认字体(需安装小米兰亭)

### 使用

1. 下载

   [Releases](https://github.com/llsccm/sgs-Electron/releases) 中打包好的 app.asar 文件

2. 替换资源

   将 app.asar 文件移动至官方微端目录下 resources 文件夹，替换原文件

### 鸣谢

[三国杀打小抄](https://greasyfork.org/zh-CN/scripts/448004)

### 如何使用最新版本？

1. 全局安装 `asar`

```
 npm install -g asar
```

2. 用 `asar pack` 打包

```
asar pack 文件夹名称 app.asar
```

### 声明

美术资源归游卡所有，本项目仅用于学习和测试！
