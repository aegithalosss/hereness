# Hereness 0.1.3 发布说明（GitHub Release 用）

小汀起草，Aegi 10-28 看过中文版。

[中文](#中文) · [English](#english)

## 中文

**新增**

- 支持 Antigravity（测试中）：小猫会跟着它思考、读文件、跑命令、干完活。Antigravity 没有"等你批准"的信号，所以不会为批准请求举手；工具跑完小猫才换动作。

**改进**

- 右键菜单重新排了一下：版本号挪到 Settings 上面，静音单独隔开，不容易点错。
- 语言默认跟着系统走，在设置里选过才固定下来。
- 音量条松手时才保存。
- 已经开着一只小猫时再双击，原来那只会跳到最前面；开着的是别的版本时，会提示一句，然后自己退出。
- 在任务管理器里关掉的开机自启，小猫不会再替你打开回去。搬了文件夹，开机自启的路径也会跟着更新。
- 选中的皮肤找不到时，会换回 Evie，并告诉你缺的是哪一只。
- "查看随包许可"会在资源管理器里直接选中 LICENSE 文件。
- 外接屏拔掉以后，小猫会回到主屏幕。

**修复与安全**

- 只接收本机 agent 发来的信号，网页没法冒充 agent 让小猫乱动。
- 设置文件读不出来时不会被覆盖；保存时先写临时文件，再整个换上去。
- 修好了旧版 curl 偶尔丢信号的问题；端口被占用、被系统保留时，提示会说清楚是哪一种。

**升级：** 先退出旧版，再解压新版运行。已经连接过的 agent 不用重连。

---

## English

**New**

- Antigravity support (testing): the cat follows its thinking, file reads, commands and finished turns. Antigravity does not send a signal when it waits for your approval, so the cat will not raise a paw for approval requests, and it changes pose only after each tool finishes.

**Improvements**

- Right-click menu reordered: the version line now sits above Settings, and Mute has its own section so it is harder to click by mistake.
- Language follows your system until you pick one in Settings.
- The volume slider saves when you let go.
- Opening the pet again while one is running brings the running cat to the front. If a different version is running, the new one shows a notice and then quits.
- Launch at login stays off if you turned it off in Task Manager. If you move the folder, the launch path follows.
- If the selected skin is missing, the cat falls back to Evie and tells you which skin is missing.
- "View bundled licenses" now selects the LICENSE file in File Explorer.
- After you unplug an external monitor, the cat comes back to the main screen.

**Fixes and security**

- The pet only accepts signals from local agents; web pages can no longer pose as an agent.
- A settings file that cannot be read is no longer overwritten. Saving writes a temporary file first, then swaps it in.
- Fixed occasional lost signals with older curl. Port errors now say whether the port is in use or reserved by the system.

**Upgrading:** quit the old version first, then unzip and run the new one. Agents you already connected do not need to be reconnected.

---


# 在呢 · Hereness

[中文](#中文) · [English](#english)

## 中文

一只住在桌面上的小猫，跟着你的 AI 编程 agent（Claude Code、Codex 等）一起干活：它在敲代码、在思考、在等你批准、干完了，小猫都会让你知道。

<img width="800" height="600" alt="01" src="https://github.com/user-attachments/assets/e0f43e6a-7b6a-4130-ae3d-2ba0c134cc66" />

<img width="800" height="600" alt="02" src="https://github.com/user-attachments/assets/fdf08e45-c706-42af-937f-dbe8cca4a2e8" />

想给小猫换一身自己画的皮肤，看[皮肤制作指南](docs/skin-guide.md)。


### 开始用

1. **下载：** 在 [Releases](https://github.com/aegithalosss/hereness/releases) 下载。Windows 解压 zip，双击 `Hereness.exe`；Mac 打开 dmg，把 Hereness 拖进"应用程序"。
2. **连接：** 右键小猫，点"连接 Claude Code""连接 Codex"等。Codex 和 DSH 连上以后要重开一次。Cursor 还在测试中。
3. **卸载：** 右键小猫 → Settings → 高级，最下面有步骤。

### 隐私

桌宠只在你自己的电脑上工作：

* **只在本机听。** agent 通过本机地址（127.0.0.1:47621）告诉桌宠"在干活 / 在等你 / 干完了"，别的电脑连不进来。
* **只看一眼，不记下来。** 为了在举手气泡里写"想运行什么、想改哪个文件"，桌宠会读消息里的工具名、命令或文件路径。这些只在内存里，不写进任何文件。
* **不往外发。** 桌宠不联网，不上传任何东西，也没有统计。
* **记住 Agent 正在工作的项目。** 在高级设置里点"扫描"、把项目加进名单以后，桌宠会在本机设置文件夹保存这个项目的完整路径和你起的昵称，好在气泡里认出是哪个项目。只保存你自己加进去的；从名单删掉就一起删掉，想加回来再扫一次。
* **会改动的地方：** 连接时，会在 agent 的设置文件里加上几行 hooks（原文件会先备份）；断开时只删桌宠自己加的那几行。你的设置（语言、大小、皮肤）存在程序的设置文件夹里。

### 使用与许可

本项目源码公开，欢迎免费使用、二创和分享。

* **放心使用：** 个人使用、上班、直播、录像都可以，包括有收入的场景。
* **欢迎创作：** 可以修改桌宠、制作并免费分享皮肤，也可以付费请画师制作自用皮肤。创作者保留自己原创作品的权利。
* **请先获得授权：** 出售本项目、修改版或含本项目素材的内容，以及将项目代码或素材用于其他产品，无论是否收费。
* **制作新皮肤时：** 欢迎注明创作者；用了 AI 生成图片的话，也欢迎注明所用工具。
* **分享修改后的皮肤或动画时：** 请保留原作者署名及已有的 AI 制作说明，并追加 Modified by: 你的名字或笔名。

请勿冒充原作者或官方版本。内置广告、收费增值服务等限制，以及私人约稿的具体规则，见仓库中的 [`LICENSE`](LICENSE)；本说明是简要介绍，以完整许可为准。

授权联系：[Aegithalos](https://github.com/aegithalosss)。

### 特别鸣谢

特别鸣谢 [jovesun-lab](https://github.com/jovesun-lab)，没有你我无法做出这个项目。

特别鸣谢 小汀，没有你就没有这个项目。

## English

A little cat that lives on your desktop and works alongside your AI coding agent (Claude Code, Codex and more). Coding, thinking, waiting for your approval, done: the cat lets you know.

To draw your own skin for the cat, see the [skin guide](docs/skin-guide.md) (in Chinese for now).

### Getting started

1. **Download** from [Releases](https://github.com/aegithalosss/hereness/releases). Windows: unzip and double-click `Hereness.exe`. Mac: open the dmg and drag Hereness into Applications.
2. **Connect:** right-click the cat and choose "Connect Claude Code", "Connect Codex", and so on. Restart Codex or DSH once after connecting. Cursor support is still in testing.
3. **Uninstall:** right-click the cat → Settings → Advanced; the steps are at the bottom.

### Privacy

The pet works entirely on your own computer:

* **Local only.** Your agent tells the pet what it's doing through a local address (127.0.0.1:47621). Other computers can't connect.
* **Looks, doesn't keep.** To show "wants to run…" or "wants to edit…" in the bubble, the pet reads the tool name, command or file path from each message. This stays in memory and is never written to disk.
* **Sends nothing.** The pet doesn't go online, upload anything, or collect usage data.
* **Remembers the projects your agents work in.** When you scan and add a project in Advanced settings, the pet saves that project's full path and your nickname in the local app settings folder, so the bubble can tell projects apart. Only projects you add are saved; removing one deletes it, and you can scan again to add it back.
* **What it changes:** Connecting adds a few hook lines to your agent's settings file (the original is backed up first). Disconnecting removes only the lines the pet added. Your own settings (language, size, skin) are saved in the app's settings folder.

### Usage and License

This project is source-available. Free use, customization, and sharing are welcome.

* **Use it freely:** Personal use, workplace use, livestreams, and recordings are permitted, including monetized media.
* **Create and share:** You may modify the desktop pet, create and share skins for free, and commission artists to make skins for your private use. Creators retain their rights in their original work.
* **Get permission first:** Selling the Project, modified versions, or content containing Project materials, or reusing Project code or materials in another product, requires prior written permission, even if that other product is free.
* **When creating a new skin:** you are welcome to credit its creators, and the AI tool if AI-generated images were used.
* **When sharing modified skins or animations:** preserve the original creator credits and any existing AI-generation disclosures, and add Modified by: your name or pseudonym.

Do not claim to be the original author or present modified releases as official. Restrictions on embedded advertising and paid add-on services, along with the specific rules for private commissions, are detailed in [`LICENSE`](LICENSE). This summary is for convenience; the full license governs.

For permission, contact [Aegithalos](https://github.com/aegithalosss).

### Special thanks

Special thanks to [jovesun-lab](https://github.com/jovesun-lab). Without you, I could not have made this project.

Special thanks to Ting. Without you, I wouldn’t have gone anywhere.

