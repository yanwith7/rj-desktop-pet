# 窝头 RJ 桌面宠物 / RJ Desktop Pet

[中文](README.md) · [English](README.en.md) · [下载最新版本](https://github.com/yanwith7/rj-desktop-pet/releases/latest)

这是一个面向 macOS 和 Windows 的轻量桌面宠物 MVP。当前内置已经确认过的「可爱帅气窝头 RJ」v2 spritesheet，运行后会显示为透明、无边框、始终置顶的小窗口。

## 下载与安装

请在项目的 **Releases** 页面选择与你的电脑匹配的文件：

| 你的电脑 | 推荐下载 | 说明 |
| --- | --- | --- |
| MacBook / iMac（M1、M2、M3、M4） | `mac-arm64.dmg` | Apple Silicon 机型，绝大多数近年 Mac 选择这个。 |
| MacBook / iMac（Intel 芯片） | `mac-x64.dmg` | 2019 年及更早的多数 Intel Mac。 |
| 普通 Windows 10 / 11 电脑 | `win-x64.exe` | 推荐；会安装应用并创建桌面快捷方式。 |
| Windows on ARM 设备 | `win-arm64.exe` | 例如部分 Surface Pro X / Snapdragon Windows 电脑。 |

macOS 的 `.zip` 与 `.dmg` 内容相同，通常优先下载 `.dmg`。应用首次运行后，可在右键菜单的“设置”里选择中文或 English。

macOS 首次运行未签名版本时，若系统拦截，请在访达中按住 Control 点击应用并选择“打开”。Windows 若出现 SmartScreen 提示，待正式代码签名后会明显减少；当前可通过“更多信息 → 仍要运行”启动。



## 针对MAC下载后显示无法验…恶意软件/无法打开的问题：
- 1.弹窗点击完成
- 2.打开设置
- 3.设置—隐私与安全性—安全性
- 4.找到“已阻止…..以保护Mac”——选择仍要打开—-仍要打开—输入密码
- 5.打开软件


## 已有交互

- 单击：挥手
- 点击头部：仅头部低头并小幅摇晃，身体保持不动；黑色面罩下缘出现粉色红晕、眼睛变成 `> <`，并回复 10 点活力
- 右键：打开动作菜单
- 拖动：可自由移动宠物位置
- 大小滑杆：72–300 px 自由缩放，默认是更接近 Codex 桌宠的小尺寸
- 向左／向右走：播放对应动作并移动窗口
- 转圈：持续旋转，直到切换其他状态；眼睛变成眩晕的 `𖦹 𖦹`
- 菜单仅展示：工作（等待动作）、跳跃、转圈、左右走与“呀吼”；待机保持为默认状态
- 可选粉色血条：每 3 分钟自然减少 1 点；每次菜单动作扣除 2 点、左右走扣除 2 点、“呀吼”扣除 3 点；摸头回复 10 点
- 可选粉色像素气泡：默认“主人，今天也请加油吧！”，无论文字长短都固定贴近 RJ 右侧；长文字只向右下延展，最多 7 行、每行最多 14 字，并避开边框、爱心和尾巴。
- 惊喜功能💗“呀吼”：右键菜单中播放真人内置语音，并播放约 4 秒的双手双脚交替挥舞、跳动、大号像素彩带与兴奋 `^ ^` 眼睛动画，随后恢复待机。
- 右键打开可爱像素风菜单；可用右上角 × 关闭面板
- 可在菜单中选择开机自启
- 记住上次窗口位置
- 可暂时隐藏或退出；隐藏后点击系统托盘的 RJ 图标即可显示（右键托盘图标也有“显示 RJ”），macOS 点击 Dock 图标也会恢复

## 本地运行

需要 Node.js 20+。在本目录执行：

```bash
pnpm install
pnpm start
```

## 生成安装包

在 macOS 上生成 Apple Silicon 与 Intel 的 `.dmg` 和 `.zip`：

```bash
pnpm run dist:mac
```

在 Windows 上生成 x64 与 ARM64 的安装器和便携版：

```bash
pnpm run dist:win
```

生成物会放在 `dist/`。macOS 正式对外分发前还需要 Apple Developer ID 签名与 notarization；Windows 正式分发前建议配置代码签名证书，这样别人首次安装时的系统拦截会少很多。

项目也带有 `.github/workflows/build.yml`：推送 `v*` 标签时，会分别在 macOS 和 Windows runner 上生成全部安装包，并自动创建 GitHub Release。手动运行时，构建结果会保留在 Actions 的构建产物中。这样你不需要在一台电脑上交叉编译两个平台。

## 后续扩展宠物

每只宠物独立放在 `src/pets/<id>/`，至少包含一份配置和一张 v2 `spritesheet.webp`。在 `src/pets/index.json` 里追加一项即可扩展选择器。当前 UI 先默认 RJ，之后可以继续加宠物选择、托盘菜单、自动启动、点击回应和更新机制。
