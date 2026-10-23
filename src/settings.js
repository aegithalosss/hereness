const inv = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);
const $ = (id) => document.getElementById(id);
const IS_MAC = navigator.userAgent.includes("Mac");

const T = {
  zh: {
    title: "Settings",
    "tab-global": "全局",
    "tab-style": "风格化",
    "tab-about": "关于",
    time: "时间",
    "time-system": "跟随系统",
    size: "桌宠大小",
    "size-s": "小",
    "size-m": "中",
    "size-l": "大",
    pin: "置顶&勿扰",
    "pin-top": "总在最上面",
    "pin-normal": "普通",
    "pin-quiet": "勿扰（不弹气泡）",
    ds: "DeepSeek 低价提示",
    remember: "记住上次位置",
    autostart: "开机自动启动",
    "autostart-dev": "开发版不能开机自启，正式版才可以。",
    "save-failed": "设置没存上，已恢复原值。",
    "refresh-failed": "设置已保存，但无法刷新显示。",
    "autostart-query-failed": "无法查询开机自启，状态未知。",
    "autostart-save-failed": "开机自启没改成功，已重新查询系统状态。",
    taskbar: "在任务栏隐藏",
    agents: "监控 Agent",
    more: "敬请期待更多",
    bubble: "气泡",
    privacy: "气泡只显示是谁，不显示内容",
    folders: "文件夹昵称",
    "stuck-reminder": "agent 卡太久时提醒我",
    "stuck-unit": "分钟",
    "folders-hint": "点“扫描”，会列出现在正在干活的 agent 所在的文件夹。挑你常用的项目加进来，起个昵称。\n比如给 my-project 起名“桌宠”，这个项目的 agent 找你时，气泡就写“[桌宠 · Codex] 找你”。不起昵称就照旧写“[Codex] 找你”。",
    "tab-advanced": "高级",
    "folders-remove": "删掉",
    "folders-scan": "扫描正在工作的 agent",
    "folders-empty": "暂无agent。扫描只看得到现在正在干活的 agent，先让 agent 干着活，再点扫描。",
    "folders-placeholder": "昵称写这里，最多8个中文字",
    "folders-failed": "扫描没有完成，请再试一次。",
    "folders-legacy": "旧昵称，尚未绑定完整路径",

    storage: "桌宠在电脑上存的东西",
    "storage-hint": "桌宠的设置和网页缓存存在下面两个文件夹里。\n彻底卸载：\n1. 把所有 agent 都断开，关掉开机自动启动；\n2. 自己做的皮肤（skins）和状态提示（status）还要的话，记得先保存；\n3. 打开下面两个文件夹；\n4. 退出桌宠，删掉这两个文件夹；\n5. 最后删掉桌宠程序本身：Windows 删掉解压出来的整个文件夹，Mac 把 Hereness 拖到废纸篓；\n6. 你的用户文件夹（C:\\Users\\你的名字\\）里，.claude、.codex、.cursor、.qwen、.dsh 这几个文件夹中，名字以 .hereness.bak 结尾的文件是桌宠改设置前留的备份，一起删掉。",
    "store-settings-open": "打开设置文件夹",
    "store-cache-open": "打开缓存文件夹",
    "store-both-open": "打开设置和缓存文件夹",
    "storage-hint-mac": "桌宠的设置和网页缓存都存在下面这个文件夹里。\n彻底卸载：\n1. 把所有 agent 都断开，关掉开机自动启动；\n2. 自己做的皮肤（skins）和状态提示（status）还要的话，记得先保存；\n3. 打开下面这个文件夹；\n4. 退出桌宠，删掉这个文件夹；\n5. 最后把 Hereness 拖到废纸篓；\n6. 你的个人文件夹（~/）里，.claude、.codex、.cursor、.qwen、.dsh 这几个隐藏文件夹中（在访达里按 Cmd+Shift+. 显示），名字以 .hereness.bak 结尾的文件是桌宠改设置前留的备份，一起删掉。",
    "license-open-failed": "无法打开随包许可。请确认安装包完整，或重新下载桌宠。",
    "system-apply-failed": "部分设置未生效。",
    "apply-size-failed": "大小未能应用。可以退出桌宠再打开试一次。",
    "apply-pin-failed": "置顶未能应用。可以退出桌宠再打开试一次。",
    "apply-hide_from_taskbar-failed": "任务栏设置未能应用。可以退出桌宠再打开试一次。",
    "apply-prefs-failed": "系统状态已读回，但未能保存恢复后的设置。可以退出桌宠再打开试一次。",
    "system-unknown": "状态未知，已停用该项。",
    "unknown": "未知",
    "store-missing": "还没有",
    signals: "最近收到的信号",
    "signals-hint": "桌宠这次打开以来，从 agent 收到的最近 60 条信号，新的在上面。只在内存里，退出就没了；不记命令和路径。小猫提醒得不对时，展开看看最后收到的是什么。",
    "signals-show": "展开",
    "signals-hide": "收起",
    "signals-empty": "这次打开以来还没有收到信号。",
    "signals-time": "时间",
    "signals-from": "来源 · 会话",
    "signals-state": "状态",
    "signals-event": "事件 · 工具",
    skin: "当前皮肤",
    status: "状态提示",
    volume: "音量",
    detail: "设置详细皮肤",
    "detail-show-hint": "查看使用说明",
    "guide-0-title": "皮肤文件夹",
    "guide-0-0": "切换皮肤时，这只皮肤的图片设置和声音设置会一起换。",
    "guide-0-1": "每一行是一个 agent 状态，后面写着这只皮肤实际在用的图。点小眼睛可以预览。",
    "guide-0-2": "缺图的行，可以从这只皮肤已有的图里挑一张顶上。",
    "guide-0-switch": "可有可无的动作前面有开关，关掉就不播这个动作，也不出声（比如关掉闲着，那段时间就一直是待机）。",
    "row-off": "不启用",
    "row-switch": "启用这个动作",
    "guide-0-3": "所有图的旋转中心都在脚底附近，小猫做动作时绕着它转。想改的话，改 skin.json 里的 pivot。",
    "guide-0-4": "加图、改图以后，点一下设置窗口让它回到前面，小猫就会重新读图；还没变的话，右键退出桌宠再打开。",
    "guide-1-title": "命名规则",
    "guide-1-0": "每个状态都有自己的文件名，就是英文行名的小写，比如思考 thinking.png、干完活 done.png，大小写随意。放进皮肤文件夹就会被自动读取。特效图（汗、loading 圈这种叠在上面的）按 vfx_行名_叫什么 命名，比如 vfx_thinking_loading.png，还要在 skin.json 里写明叠在哪几张图上，写法见《皮肤制作指南》。",
    "guide-1-1": "一个状态想放好几张：用 xxx1.png、xxx2.png 编号，小猫会从里面挑一张。工作（typing）例外，编号的几张会轮流播放，像在打字。",
    "guide-1-2": "图太多时，可以建一个以状态命名的文件夹，比如 sleep 文件夹，里面的图名字随意。",
    "guide-1-3": "同一个状态既有文件夹又有 png 时，先用文件夹（比如有 sleep 文件夹时，不读 sleep.png）。",
    "guide-1-4": "idle_rig 文件夹比较特殊：它是做了绑骨的待机动画，因为开发时间有限，暂时没有继续做。想用它做自己的皮肤，可以直接替换里面的图，但每张图的位置和旋转中心要和原图一致。",
    "guide-1-5": "编号图和状态文件夹里的图都不限张数。",
    "guide-1-6": "睡着、闲着也从整行图片里随机换图，不分档；有多张时不会连着用同一张。",
    "guide-1-7": "空文件夹（里面没有 PNG）当作没有，继续找单张或编号图。",
    "guide-2-title": "声音",
    "guide-2-0": "声音放在皮肤文件夹的 sounds 里，在右边\"声音\"那列选。选文件夹的话，每次随机挑一个。",
    "guide-3-title": "做自己的皮肤",
    "guide-3-0": "可以直接改现有皮肤里的图，也可以复制一整个皮肤文件夹再改，小猫会自动认出新皮肤。画图时四周建议留出 20% 空白，不然动起来容易被切掉（详见《皮肤制作指南》）。",
    "guide-3-1": "皮肤的名字在 skin.json 的 name 里改。",
    "guide-3-2": "改完记得更新 credits（创作者）。改的是别人的作品，可以写上原作者，再加一行 Modified by 你的名字。",
    "author": "作者",
    "co-creation": "共同创作",
    "co-creation-body": "小汀（Claude Agent）",
    dev: "研发",
    "dev-body": "Claude Code、Deepseek（Code & Chat）、ChatGPT & Codex",
    "holiday-credit": "法定节假日数据：holiday-cn（MIT License, Copyright (c) 2019 NateScarlet）",
    "pixabay-credit": "部分小猫的叫声来自 Pixabay",
    support: "技术支持",
    "list-sep": "、",
    cheer: "情绪价值提供",
    "cheer-body": "小苗 🌱 和 ChatGPT Instant",
    ideas: "想法贡献者",
    "find-me": "如果喜欢我的作品，欢迎到小红书或者 X 来找我玩：",
    "xhs": "小红书",
    "about-version": "当前版本：",
    "about-tagline": "一只住在桌面上的小猫，跟着你的 AI agent 一起干活。",
    "about-f1": "跟着 agent 换动作",
    "about-f2": "要你批准时举手",
    "about-f3": "卡住时提醒",
    "about-f4": "换皮肤",
    "credits-title": "制作人员",
    ok: "确认",
    "agent-missing": "（没找到）",
    "agent-claude-q":
      "在你电脑上运行的 Claude Code 干活时，小猫会跟着它的活换动作。云端的会话（claude.ai 网页上的）连不到小猫。",
    "agent-codex-q":
      "在你电脑上运行的 Codex 干活时，小猫会跟着它的活换动作。云端的 Codex 会话连不到小猫。注意：Codex 请你扩大权限时（比如「允许编辑某个文件夹」），小猫不会举手。这是 Codex 的设计，不是小猫坏了。在小猫这边连接或断开 Codex 以后，要重开一次 Codex 才生效。",
    "codex-trust-btn": "信任步骤",
    "codex-trust-hint": "再看一遍怎么让 Codex 信任桌宠（第一次连接时会自动弹出来）",
    "agent-qwen-q": "Qwen Code（阿里的命令行工具）。本机还没装过，未实测",
    "agent-dsh-q": "在你电脑上运行的 DSH 干活时，小猫会跟着它的活换动作。DSH 停下来等你决定时，小猫不会举手，因为 DSH 没有发这个信号。在小猫这边连接或断开 DSH 以后，要重启一次 DSH 才生效。",
    "agent-dsh-limit": "（不会举手）",
    "agent-cursor-q": "Cursor（测试中）。小猫会跟着干活、干完、出错换动作。Cursor 没有“等你批准”的信号，所以小猫不会为批准请求举手。如果已连接 Claude Code，并在 Cursor 开着“导入第三方 hooks”，不在这里连接 Cursor，小猫也会动，气泡写 Cursor。连接或断开后，Cursor 会自动重新载入配置；如果没反应，重启一下 Cursor。",
    "skin-title": "这只皮肤的图",
    "skin-missing": "skins 文件夹要和 exe 放在同一个文件夹里",
    "skin-missing-mac": "点「打开这只皮肤的文件夹」看看",
    "status-open": "打开状态提示文件夹",
    "skin-reset": "恢复默认",
    "skin-open": "打开这只皮肤的文件夹",
    "row-idle": "待机",
    "row-prompt": "接活",
    "row-thinking": "思考",
    "row-crosseye": "思考过度",
    "row-reading": "读文件",
    "row-typing": "工作",
    "row-bash": "跑命令",
    "row-notify": "举手",
    "row-error": "出错",
    "row-poke": "戳戳",
    "row-look": "闲着",
    "row-yawn": "困了",
    "row-wake": "戳醒",
    "row-lifted": "提起",
    "row-done": "干完活",
    "row-angry": "生气",
    "row-sleep": "睡着",
    "row-dropped": "放下",
    "sounds-title": "声音",
    "sound-repeat-before": "agent 的叫声",
    "sound-repeat-after": "秒内最多一次",
    "sound-repeat-label": "agent 的叫声 X 秒内最多一次",
    "sound-repeat-seconds": "叫声间隔（秒）",
    "sound-none": "无",
    "sound-remove": "拿掉这一行的声音",
    "sound-reset": "恢复默认",
    "preview-before": "点击",
    "preview-after": "预览小猫",
    "preview-label": "预览：",
    "preview-image": "预览图片",
    "preview-prev": "上一张",
    "preview-next": "下一张",
    "preview-error": "图片无法读取",
    "sound-preview": "试听声音",
    "sound-preview-error": "无法试听声音",
  },
  en: {
    title: "Settings",
    "tab-global": "General",
    "tab-style": "Style",
    "tab-about": "About",
    time: "Time",
    "time-system": "System",
    size: "Pet size",
    "size-s": "Small",
    "size-m": "Medium",
    "size-l": "Large",
    pin: "On top & quiet",
    "pin-top": "Always on top",
    "pin-normal": "Normal",
    "pin-quiet": "Quiet (no bubble)",
    ds: "DeepSeek off-peak badge",
    remember: "Remember last position",
    autostart: "Launch at login",
    "autostart-dev": "Launch at login is only available in the release build.",
    "save-failed": "Settings could not be saved. The previous value has been restored.",
    "refresh-failed": "Settings were saved, but the display could not be refreshed.",
    "autostart-query-failed": "Could not check launch at login. Its status is unknown.",
    "autostart-save-failed": "Launch at login could not be changed. The system status has been checked again.",
    taskbar: "Hide from taskbar",
    agents: "Monitored agents",
    more: "More coming",
    bubble: "Bubble",
    privacy: "Bubble shows only who is waiting",
    folders: "Folder nicknames",
    "stuck-reminder": "Remind me when an agent gets stuck",
    "stuck-unit": "min",
    "folders-hint": "Click “Scan” to list the folders your agents are working in now. Keep the projects you use and give them nicknames.\nFor example, call my-project “Pet” to see “[Pet · Codex] needs you”. Leave the nickname blank to keep “[Codex] needs you”.",
    "tab-advanced": "Advanced",
    "folders-remove": "Remove",
    "folders-scan": "Scan working agents",
    "folders-empty": "No agents yet. Scanning only finds agents working now. Start an agent on a task, then scan again.",
    "folders-placeholder": "Nickname, up to 16 letters",
    "folders-failed": "The scan did not finish. Please try again.",
    "folders-legacy": "Old nickname, not yet linked to a full path",

    storage: "What the pet keeps on your computer",
    "storage-hint": "The pet's settings and web cache live in the two folders below.\nTo uninstall completely:\n1. Disconnect every agent and turn off launch at startup;\n2. Save any skins or status prompts you made, if you still want them;\n3. Open the two folders below;\n4. Quit the pet and delete the two folders;\n5. Finally, delete the pet itself: on Windows, delete the whole unzipped folder; on Mac, drag Hereness to the Trash;\n6. In your user folder (C:\\Users\\your name\\), inside the .claude, .codex, .cursor, .qwen and .dsh folders, delete the files ending in .hereness.bak. They are backups the pet saved before changing settings.",
    "store-settings-open": "Open settings folder",
    "store-cache-open": "Open cache folder",
    "store-both-open": "Open settings and cache folder",
    "storage-hint-mac": "The pet's settings and web cache both live in the folder below.\nTo uninstall completely:\n1. Disconnect every agent and turn off launch at startup;\n2. Save any skins or status prompts you made, if you still want them;\n3. Open the folder below;\n4. Quit the pet and delete this folder;\n5. Finally, drag Hereness to the Trash;\n6. In your home folder (~/), inside the hidden .claude, .codex, .cursor, .qwen and .dsh folders (press Cmd+Shift+. in Finder to show them), delete the files ending in .hereness.bak. They are backups the pet saved before changing settings.",
    "license-open-failed": "Could not open the bundled license. Check that the installation is complete, or download the pet again.",
    "system-apply-failed": "Some settings did not take effect.",
    "apply-size-failed": "Size could not be applied. Quit the pet and open it again to retry.",
    "apply-pin-failed": "Always on top could not be applied. Quit the pet and open it again to retry.",
    "apply-hide_from_taskbar-failed": "The taskbar setting could not be applied. Quit the pet and open it again to retry.",
    "apply-prefs-failed": "The system state was checked, but the restored settings could not be saved. Quit the pet and open it again to retry.",
    "system-unknown": "Status is unknown. This setting is disabled.",
    "unknown": "Unknown",
    "store-missing": "Not there yet",
    signals: "Recent signals",
    "signals-hint": "The last 60 signals the pet got from agents since it started, newest on top. Kept in memory only and gone when you quit; no commands or paths. If the cat's reminder looks wrong, open this and check what came in last.",
    "signals-show": "Show",
    "signals-hide": "Hide",
    "signals-empty": "No signals since the pet started.",
    "signals-time": "Time",
    "signals-from": "Source · session",
    "signals-state": "State",
    "signals-event": "Event · tool",
    skin: "Current skin",
    status: "Status",
    volume: "Volume",
    detail: "Set up skin in detail",
    "detail-show-hint": "Show instructions",
    "guide-0-title": "Skin folder",
    "guide-0-0": "When you switch skins, its picture and sound settings switch together.",
    "guide-0-1": "Each row is an agent state and shows the picture this skin actually uses. Click the eye to preview it.",
    "guide-0-2": "If a row is missing a picture, you can pick a replacement from this skin’s existing pictures.",
    "guide-0-switch": "Optional actions have a switch in front. Turn it off and the cat won’t play that action or its sound (for example, with Bored off, the cat just stays idle during that time).",
    "row-off": "Off",
    "row-switch": "Use this action",
    "guide-0-3": "All pictures rotate around a point near the feet when the cat moves. To change it, edit pivot in skin.json.",
    "guide-0-4": "After adding or changing pictures, click the Settings window to bring it to the front and the cat reloads them. If nothing changes, quit the pet from the right-click menu and open it again.",
    "guide-1-title": "Naming rules",
    "guide-1-0": "Each state uses its English row name in lowercase as the file name, such as thinking.png and done.png. Uppercase letters work too. Put the files in the skin folder and the pet will read them automatically. Effect pictures (sweat, the loading ring and other things drawn on top) are named vfx_ + row name + _ + any name, such as vfx_thinking_loading.png, and skin.json must say which pictures they go on; see the Skin Guide.",
    "guide-1-1": "To use several pictures for one state, number them xxx1.png, xxx2.png, and so on. The cat picks one. Typing is the exception: its numbered pictures play in a loop, like typing.",
    "guide-1-2": "If you have many pictures, put them in a folder named after the state, such as sleep. Pictures inside can have any name.",
    "guide-1-3": "If a state has both a folder and PNG files, the folder takes priority. For example, when there is a sleep folder, sleep.png is not used.",
    "guide-1-4": "The idle_rig folder is special: it contains a rigged idle animation. Work on it is paused because development time is limited. To use it for your own skin, replace the pictures inside, keeping each picture’s position and rotation center the same as the original.",
    "guide-1-5": "Numbered pictures and pictures in state folders have no count limit.",
    "guide-1-6": "Sleep and Bored also pick from the whole row at random, without stages. When there is more than one picture, the next pick will be different.",
    "guide-1-7": "An empty folder (with no PNG files) is treated as missing. The pet then looks for single or numbered pictures.",
    "guide-2-title": "Sounds",
    "guide-2-0": "Put sounds in the skin folder’s sounds folder and select them in the Sounds column on the right. If you select a folder, one sound is picked at random each time.",
    "guide-3-title": "Make your own skin",
    "guide-3-0": "You can edit pictures in an existing skin or copy a whole skin folder and edit the copy. The cat will recognize the new skin automatically. Leave about 20% empty space around the cat, or it may get cut off when it moves (see the Skin Guide).",
    "guide-3-1": "Change the skin’s name in the name field in skin.json.",
    "guide-3-2": "Remember to update credits when you're done. If you changed someone else's work, you can keep the original author and add a line: Modified by your name.",
    "author": "Author",
    "co-creation": "Co-creation",
    "co-creation-body": "Ting (Claude Agent)",
    dev: "Development",
    "dev-body": "Claude Code, Deepseek (Code & Chat), ChatGPT & Codex",
    "holiday-credit": "Public holiday data: holiday-cn (MIT License, Copyright (c) 2019 NateScarlet)",
    "pixabay-credit": "Some cat sounds are from Pixabay",
    support: "Technical support",
    "list-sep": ", ",
    cheer: "Emotional support",
    "cheer-body": "小苗 🌱 and ChatGPT Instant",
    ideas: "Idea contributor",
    "find-me": "If you like my work, come say hi on Xiaohongshu or X:",
    "xhs": "Xiaohongshu",
    "about-version": "Version: ",
    "about-tagline": "A little cat that lives on your desktop and works alongside your AI agent.",
    "about-f1": "Follows what your agent is doing",
    "about-f2": "Raises a paw when it needs your approval",
    "about-f3": "Reminds you when it seems stuck",
    "about-f4": "Swappable skins",
    "credits-title": "Credits",
    ok: "OK",
    "agent-missing": "(not found)",
    "agent-claude-q":
      "When Claude Code runs on your computer, the cat changes its actions to follow its work. Cloud sessions on claude.ai cannot connect to the cat.",
    "agent-codex-q":
      "When Codex runs on your computer, the cat changes its actions to follow its work. Cloud Codex sessions cannot connect to the cat. When Codex asks for broader permissions, such as permission to edit a folder, the cat will not raise a paw. This is how Codex works; the cat is not broken. After connecting or disconnecting Codex through the cat, restart Codex for the change to take effect.",
    "codex-trust-btn": "Trust steps",
    "codex-trust-hint": "Show again how to let Codex trust the pet (it also pops up the first time you connect)",
    "agent-qwen-q": "Qwen Code (Alibaba's CLI). Not installed / not verified on this machine yet",
    "agent-dsh-q": "When DSH runs on your computer, the cat changes its actions to follow its work. When DSH pauses for your decision, the cat will not raise a paw because DSH does not send that signal. After connecting or disconnecting DSH through the cat, restart DSH for the change to take effect.",
    "agent-dsh-limit": "(no approval signal)",
    "agent-cursor-q": "Cursor (Testing). The cat follows its work, completion, and errors. Cursor does not send a signal when waiting for your approval, so the cat will not raise a paw for approval requests. If Claude Code is already connected and third-party hook imports are enabled in Cursor, the cat can follow Cursor without connecting it here; bubbles show Cursor. Cursor reloads the configuration automatically after connecting or disconnecting. If nothing happens, restart Cursor.",
    "skin-title": "This skin's images",
    "skin-missing": "The skins folder has to be in the same folder as the exe",
    "skin-missing-mac": "Click \"Open this skin's folder\" to check",
    "status-open": "Open status folder",
    "skin-reset": "Reset to default",
    "skin-open": "Open this skin's folder",
    "row-idle": "Idle",
    "row-prompt": "On it",
    "row-thinking": "Thinking",
    "row-crosseye": "Overthinking",
    "row-reading": "Reading",
    "row-typing": "Typing",
    "row-bash": "Running",
    "row-notify": "Notify",
    "row-error": "Error",
    "row-poke": "Poked",
    "row-look": "Bored",
    "row-yawn": "Yawn",
    "row-wake": "Wake",
    "row-lifted": "Grab",
    "row-done": "Done",
    "row-angry": "Angry",
    "row-sleep": "Sleep",
    "row-dropped": "Dropped",
    "sounds-title": "Sounds",
    "sound-repeat-before": "Agent sounds at most once every",
    "sound-repeat-after": "s",
    "sound-repeat-label": "Agent sounds at most once every X s",
    "sound-repeat-seconds": "Sound interval in seconds",
    "sound-none": "None",
    "sound-remove": "Remove this sound",
    "sound-reset": "Restore defaults",
    "preview-before": "Click",
    "preview-after": "to preview",
    "preview-label": "Preview: ",
    "preview-image": "Preview image",
    "preview-prev": "Previous image",
    "preview-next": "Next image",
    "preview-error": "Image could not be loaded",
    "sound-preview": "Preview sound",
    "sound-preview-error": "Sound could not be played",
  },
};
const t = (key) => (T[lang] && T[lang][key]) || key;

let data = null;
let prefs = null;

function el(tag, props, ...kids) {
  const node = document.createElement(tag);
  Object.assign(node, props || {});
  node.append(...kids);
  return node;
}

let helpOwner = null;
function helpButton(key) {
  const q = el("button", { className: "q", type: "button" }, "?");
  q.setAttribute("aria-expanded", "false");
  q.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (helpOwner === q) closeHelp();
    else openHelp(q, t(key));
  });
  return q;
}
function openHelp(q, text) {
  closeHelp();
  closePick();
  const pop = $("help-pop");
  pop.textContent = text;
  pop.hidden = false;
  helpOwner = q;
  q.setAttribute("aria-expanded", "true");
  q.classList.add("open");
  const r = q.getBoundingClientRect();
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  const left = Math.max(8, Math.min(r.left - 8, window.innerWidth - w - 8));
  const below = r.bottom + 6;
  const top = below + h + 8 > window.innerHeight ? Math.max(8, r.top - 6 - h) : below;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}
function closeHelp() {
  if (!helpOwner) return;
  $("help-pop").hidden = true;
  helpOwner.setAttribute("aria-expanded", "false");
  helpOwner.classList.remove("open");
  helpOwner = null;
}
function wireHelp() {
  const pop = el("div", { id: "help-pop", role: "tooltip", hidden: true });
  document.body.append(pop);
  document.addEventListener("click", (e) => {
    if (helpOwner && !pop.contains(e.target)) closeHelp();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeHelp();
  });
  document.addEventListener("scroll", closeHelp, true);
  window.addEventListener("resize", closeHelp);
}

let pickOwner = null;
function pickButton(owner) {
  const button = el("button", { type: "button", className: "pick" }, el("span", { className: "pick-label" }));
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  owner.button = button;
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (pickOwner && pickOwner.button === button) closePick();
    else openPick(owner);
  });
  button.addEventListener("keydown", (e) => {
    if (!pickOwner && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      openPick(owner);
    }
  });
  return button;
}
function pickLabel(owner) {
  const current = owner.groups().flat().find((it) => it.value === owner.value());
  owner.button.firstChild.textContent = current ? current.label : "";
  owner.button.title = current ? current.label : "";
  owner.button.classList.toggle("missing", !current || !!current.disabled);
}
function pickList(groups, value, onChange) {
  const owner = { groups: () => groups, value: () => value, onChange };
  pickButton(owner);
  pickLabel(owner);
  return owner.button;
}
function selectGroups(select) {
  const groups = [[]];
  const add = (o) => groups[groups.length - 1].push({ value: o.value, label: o.textContent, disabled: o.disabled });
  for (const node of select.children) {
    if (node.tagName === "HR") groups.push([]);
    else if (node.tagName === "OPTGROUP") {
      groups.push([]);
      for (const o of node.children) add(o);
      groups.push([]);
    } else if (node.tagName === "OPTION") add(node);
  }
  return groups.filter((g) => g.length);
}
const SELECT_VALUE = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
function enhanceSelect(select) {
  if (select.dataset.pick) return select.nextElementSibling;
  select.dataset.pick = "1";
  const owner = {
    groups: () => selectGroups(select),
    value: () => select.value,
    onChange: (v) => {
      SELECT_VALUE.set.call(select, v);
      sync();
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    },
  };
  const button = pickButton(owner);
  const sync = () => {
    pickLabel(owner);
    button.disabled = select.disabled;
  };
  Object.defineProperty(select, "value", {
    configurable: true,
    get: () => SELECT_VALUE.get.call(select),
    set: (v) => {
      SELECT_VALUE.set.call(select, v);
      sync();
    },
  });
  new MutationObserver(sync).observe(select, { childList: true, subtree: true, attributes: true, characterData: true });
  select.hidden = true;
  select.after(button);
  sync();
  return button;
}
function openPick(owner) {
  closeHelp();
  closePick();
  let pop = $("pick-pop");
  if (!pop) {
    pop = el("div", { id: "pick-pop", role: "listbox", hidden: true });
    document.body.append(pop);
    pop.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", closePick);
    document.addEventListener("keydown", pickKey, true);
    document.addEventListener("scroll", (e) => e.target !== pop && closePick(), true);
    window.addEventListener("resize", closePick);
  }
  pop.replaceChildren();
  const value = owner.value();
  owner.groups()
    .filter((g) => g.length)
    .forEach((group, i) => {
      if (i > 0) pop.append(el("div", { className: "pick-sep", role: "separator" }));
      for (const it of group) {
        const row = el("div", { className: "pick-item", role: "option" }, it.label);
        row.dataset.value = it.value;
        if (it.disabled) row.classList.add("disabled");
        if (it.value === value) row.classList.add("selected");
        row.setAttribute("aria-selected", it.value === value ? "true" : "false");
        row.addEventListener("mousemove", () => highlight(row));
        row.addEventListener("click", () => choosePick(row));
        pop.append(row);
      }
    });
  pop.hidden = false;
  pickOwner = owner;
  owner.valueAtOpen = value;
  owner.button.setAttribute("aria-expanded", "true");
  owner.button.classList.add("open");
  const r = owner.button.getBoundingClientRect();
  pop.style.minWidth = `${r.width}px`;
  pop.style.maxHeight = "none";
  const w = pop.offsetWidth;
  const full = pop.offsetHeight;
  const roomBelow = window.innerHeight - r.bottom - 2 - 8;
  const roomAbove = r.top - 2 - 8;
  const down = full <= roomBelow || (full > roomAbove && roomBelow >= roomAbove);
  const h = Math.min(full, down ? roomBelow : roomAbove);
  pop.style.maxHeight = `${h}px`;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  pop.style.left = `${left}px`;
  pop.style.top = `${down ? r.bottom + 2 : r.top - 2 - h}px`;
  const selected = pop.querySelector(".pick-item.selected");
  highlight(selected || pop.querySelector(".pick-item:not(.disabled)"));
  if (selected) selected.scrollIntoView({ block: "nearest" });
}
function highlight(row) {
  const pop = $("pick-pop");
  if (!pop || !row) return;
  for (const r of pop.querySelectorAll(".pick-item.active")) r.classList.remove("active");
  if (!row.classList.contains("disabled")) row.classList.add("active");
}
function choosePick(row) {
  if (!pickOwner || !row || row.classList.contains("disabled")) return;
  const { valueAtOpen, onChange, button } = pickOwner;
  closePick();
  button.focus();
  if (row.dataset.value !== valueAtOpen) onChange(row.dataset.value);
}
function closePick() {
  if (!pickOwner) return;
  $("pick-pop").hidden = true;
  pickOwner.button.setAttribute("aria-expanded", "false");
  pickOwner.button.classList.remove("open");
  pickOwner = null;
}
function pickKey(e) {
  if (!pickOwner) return;
  const pop = $("pick-pop");
  const rows = [...pop.querySelectorAll(".pick-item:not(.disabled)")];
  const at = rows.indexOf(pop.querySelector(".pick-item.active"));
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const next = rows[Math.max(0, Math.min(rows.length - 1, at + (e.key === "ArrowDown" ? 1 : -1)))];
    highlight(next);
    if (next) next.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    choosePick(rows[at]);
  } else if (e.key === "Escape") {
    e.preventDefault();
    const { button } = pickOwner;
    closePick();
    button.focus();
  } else if (e.key === "Tab") {
    closePick();
  }
}

function paintRange(input) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const pct = max > min ? ((Number(input.value) - min) / (max - min)) * 100 : 0;
  input.style.setProperty("--fill", `${Math.max(0, Math.min(100, pct))}%`);
}

let savedPrefs = null;
let requestedPrefs = null;
let prefsWrite = Promise.resolve();
let prefsRevision = 0;
function settingError(key, error) {
  let message = $("settings-save-error");
  if (!message) {
    message = el("span", { id: "settings-save-error", className: "small-note", role: "status" });
    document.querySelector("footer").prepend(message);
  }
  message.textContent = `${t(key)}${error ? ` ${String(error)}` : ""}`;
}

function savePrefs() {
  const desired = { ...prefs };
  const base = requestedPrefs || savedPrefs || desired;
  const patch = Object.fromEntries(Object.entries(desired).filter(([key, value]) => value !== base[key]));
  requestedPrefs = desired;
  const revision = ++prefsRevision;
  const job = prefsWrite.then(async () => {
    const next = { ...savedPrefs, ...patch };
    let error;
    let failures = [];
    try {
      const result = await inv("prefs_set", { prefs: next });
      savedPrefs = result?.prefs || next;
      failures = result?.failures || [];
      data.system_unknown = failures.filter((issue) => issue.unknown).map((issue) => issue.field);
    }
    catch (e) { error = e; }
    if (revision === prefsRevision) {
      prefs = { ...savedPrefs };
      requestedPrefs = null;
      lang = prefs.language === "en" ? "en" : "zh";
      try {
        applyText(); fillGlobal(); await fillStyle();
        if (detailLoaded) renderDetail();
      } catch (refreshError) { if (error === undefined) settingError("refresh-failed", refreshError); }
    }
    if (error !== undefined) settingError("save-failed", error);
    else if (failures.length) showSystemFailures(failures);
    return error === undefined && failures.length === 0;
  });
  prefsWrite = job.catch((error) => { settingError("save-failed", error); });
  return prefsWrite;
}

function showSystemFailures(failures) {
  const text = failures.map((issue) => `${t(`apply-${issue.field}-failed`)} ${issue.unknown ? t("system-unknown") : ""} ${issue.error || ""}`).join("\n");
  settingError("system-apply-failed", text);
}

function showSystemStatus() {
  const unknown = data.system_unknown || [];
  for (const [id, field] of [["size", "size"], ["pin", "pin"], ["taskbar", "hide_from_taskbar"]]) {
    const node = $(id);
    const missing = unknown.includes(field);
    node.disabled = missing;
    if (id === "taskbar") { node.indeterminate = missing; continue; }
    let option = node.querySelector('option[data-system-unknown]');
    if (missing) {
      if (!option) {
        option = el("option", { value: "__unknown", disabled: true });
        option.setAttribute("data-system-unknown", "");
        node.append(option);
      }
      option.textContent = t("unknown");
      node.value = "__unknown";
    } else { option?.remove(); }
  }
}

function showAutostart() {
  const input = $("autostart");
  const known = typeof data.autostart === "boolean";
  input.indeterminate = !known;
  input.disabled = !known || (data.is_dev === true && data.autostart !== true);
  const hint = $("autostart-dev");
  hint.hidden = data.is_dev !== true;
  hint.textContent = t("autostart-dev");
  if (known) input.checked = data.autostart;
}
async function refreshAutostart() {
  try { data.autostart = await inv("autostart_get"); }
  catch (error) { data.autostart = null; settingError("autostart-query-failed", error); }
  showAutostart();
}
async function saveAutostart(input) {
  const on = input.checked;
  if (typeof data.autostart === "boolean") input.checked = data.autostart;
  input.disabled = true;
  try {
    await prefsWrite;
    data.autostart = await inv("autostart_set", { on });
    prefs.autostart = data.autostart;
    savedPrefs.autostart = data.autostart;
  } catch (error) {
    await refreshAutostart();
    settingError("autostart-save-failed", data.autostart === null ? `${error} ${t("autostart-query-failed")}` : error);
  }
  showAutostart();
}
async function saveFlag(input, command, key) {
  const old = !!data[key];
  const on = input.checked;
  input.checked = old;
  input.disabled = true;
  try { data[key] = await inv(command, { on }); }
  catch (error) { settingError("save-failed", error); }
  finally { input.checked = !!data[key]; input.disabled = false; }
}
async function saveDetail(command, args, restore = () => {}) {
  try { await inv(command, args); }
  catch (error) { restore(); settingError("save-failed", error); return false; }
  try { await loadDetail({ quiet: true }); }
  catch (error) { settingError("refresh-failed", error); }
  return true;
}

function applyText() {
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = t(node.dataset.t);
  for (const node of document.querySelectorAll("[data-language]")) node.hidden = node.dataset.language !== lang;
  document.title = "在呢 | Hereness · Settings";
  const missing = $("skin-missing");
  if (missing) missing.textContent = t(IS_MAC ? "skin-missing-mac" : "skin-missing");
  syncDetailHints();
  renderPreview();
  syncSignalsButton();
  fillSignals();
}

function fillGlobal() {
  $("language").value = prefs.language;
  $("time").value = prefs.time;
  $("size").value = prefs.size;
  $("pin").value = prefs.pin;
  $("ds").checked = !!data.ds_price;
  $("remember").checked = !!prefs.remember_position;
  showAutostart();
  $("taskbar").checked = !!prefs.hide_from_taskbar;
  showSystemStatus();
  $("privacy").checked = !!data.privacy;
  $("stuck-reminder").checked = prefs.stuck_reminder !== false;
  $("stuck-minutes").value = prefs.stuck_minutes || 10;
  $("stuck-minutes").disabled = !$("stuck-reminder").checked;
  $("volume").value = Number.isInteger(prefs.volume) ? prefs.volume : 70;
  paintRange($("volume"));
  fillAgents();
  fillFolders();
  fillStorage();
}

function fillAgents() {
  const box = $("agents");
  closeHelp();
  box.replaceChildren();
  for (const a of data.agents) {
    const q = helpButton(`agent-${a.id}-q`);
    const name = a.installed ? a.name : `${a.name} ${t("agent-missing")}`;
    const toggle = el(
      "label",
      { className: "agent-toggle" },
      el("input", { type: "checkbox", checked: a.connected, disabled: !a.installed }),
      el("span", {}, a.id === "dsh" ? `${name} ${t("agent-dsh-limit")}` : name),
    );
    const line = el("div", { className: "agent" }, toggle, q);
    line.querySelector("input").addEventListener("change", async (e) => {
      data.agents = await inv("agent_toggle", { id: a.id });
      fillAgents();
      e.stopPropagation();
    });
    if (a.id === "codex") {
      const trust = el("button", { className: "link", type: "button", title: t("codex-trust-hint") }, t("codex-trust-btn"));
      trust.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        inv("show_codex_trust").catch(() => {});
      });
      line.append(trust);
    }
    box.append(line);
  }
}

let folderWrite = Promise.resolve();
let scanTimer;
function folderError(error) {
  $("folders-error").hidden = false;
  $("folders-error").textContent = String(error);
}
function fillFolders() {
  const box = $("folders");
  box.replaceChildren();
  if (!data.known_folders.length) {
    box.append(el("p", { className: "folders-empty muted" }, t("folders-empty")));
    return;
  }
  for (const folder of data.known_folders) {
    const input = el("input", { type: "text", value: data.folder_names[folder] || "", placeholder: t("folders-placeholder") });
    FolderNames.bindInput(input);
    input.addEventListener("change", () => {
      folderWrite = folderWrite.then(async () => {
        await inv("bubble_set_folder_name", { folder, nickname: input.value });
        data.folder_names = await inv("bubble_folder_names");
      }).catch(folderError);
    });
    const remove = el("button", { type: "button", className: "btn" }, t("folders-remove"));
    remove.addEventListener("click", async () => {
      await folderWrite;
      try {
        await inv("forget_known_folder", { folder });
        data.folder_names = await inv("bubble_folder_names");
        data.known_folders = Object.keys(data.folder_names);
        fillFolders();
      } catch (e) { folderError(e); }
    });
    box.append(el("div", { className: "row folder-row" }, el("label", { htmlFor: `nickname-${folder}`, title: FolderNames.normalize(folder) ? folder : t("folders-legacy") }, FolderNames.basename(folder)), input, remove));
    input.id = `nickname-${folder}`;
  }
}

function fillStorage() {
  $("store-cache-row").hidden = IS_MAC;
  $("store-settings").textContent = t(IS_MAC ? "store-both-open" : "store-settings-open");
  document.querySelector('[data-t="storage-hint"]').textContent = t(IS_MAC ? "storage-hint-mac" : "storage-hint");
  const mark = (id, exists) => {
    const node = $(id);
    if (node) node.hidden = !!exists;
  };
  mark("store-settings-missing", data.settings_dir_exists);
  mark("store-cache-missing", data.cache_dir_exists);
}

const SIGNAL_SOURCES = { claude: "Claude Code", codex: "Codex", qwen: "Qwen Code", dsh: "DSH", cursor: "Cursor" };
let signalsOpen = false;

function syncSignalsButton() {
  const btn = $("signals-toggle");
  btn.dataset.t = signalsOpen ? "signals-hide" : "signals-show";
  btn.textContent = t(btn.dataset.t);
  $("signals").hidden = !signalsOpen;
}

async function fillSignals() {
  if (!signalsOpen) return;
  const list = await inv("recent_signals").catch(() => []);
  const box = $("signals");
  if (!list.length) {
    box.replaceChildren(el("p", { className: "muted", textContent: t("signals-empty") }));
    return;
  }
  const pad = (n) => String(n).padStart(2, "0");
  const time = (ms) => {
    const d = new Date(ms);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  const head = el("tr", {}, ...["signals-time", "signals-from", "signals-state", "signals-event"].map((k) => el("th", { textContent: t(k) })));
  const rows = list
    .slice()
    .reverse()
    .map((s) =>
      el(
        "tr",
        {},
        el("td", { textContent: time(s.at) }),
        el("td", { textContent: [SIGNAL_SOURCES[s.from] || s.from, s.session].filter(Boolean).join(" · ") }),
        el("td", { textContent: s.state }),
        el("td", { textContent: [s.event, s.tool].filter(Boolean).join(" · ") || "—" }),
      ),
    );
  box.replaceChildren(el("table", { className: "signals-table" }, el("thead", {}, head), el("tbody", {}, ...rows)));
}

let skinListGeneration = 0;
async function fillSkinSelect() {
  const generation = ++skinListGeneration;
  const list = await inv("skins_available");
  if (generation !== skinListGeneration) return;
  skinsAvailable = list || [];
  const skin = $("skin");
  const missing = $("skin-missing");
  skin.replaceChildren();
  for (const s of skinsAvailable) skin.append(el("option", { value: s.value }, s.label));
  if (missing) {
    missing.hidden = skinsAvailable.length > 0;
  }
  enhanceSelect(skin).hidden = skinsAvailable.length === 0;
  if (skinsAvailable.length) {
    const current = (prefs && prefs.skin) || skinsAvailable[0].value;
    skin.value = skinsAvailable.some((s) => s.value === current) ? current : skin.options[0].value;
  }
  if (!skin.dataset.wired) {
    skin.dataset.wired = "1";
    skin.addEventListener("change", async () => {
      preview = null;
      renderPreview();
      prefs.skin = skin.value;
      if (!await savePrefs()) return;
      if (detailLoaded) await loadDetail();
    });
  }

}

async function fillStyle() {
  await fillSkinSelect();
  const status = $("status");
  const officialId = Statuses.BUILTIN_ID;
  const officialName = Statuses.byLang(Statuses.BUILTIN, lang === "en").name || officialId;
  status.replaceChildren();
  status.append(el("option", { value: officialId }, officialName));
  for (const v of (data.statuses || []).filter((v) => v.id !== officialId)) status.append(el("option", { value: v.id }, v.name));
  status.append(el("option", { value: "off" }, lang === "en" ? "Off" : "关闭"));
  status.value = data.status;
  if (status.value !== data.status) status.value = officialId;
  if (!status.dataset.wired) {
    status.dataset.wired = "1";
    status.addEventListener("change", async () => {
      const id = status.value;
      status.value = data.status;
      try { await inv("status_set", { id }); data.status = id; status.value = id; }
      catch (error) { settingError("save-failed", error); }
    });
  }
}

let resourceRefreshRunning = false;
let resourceRefreshAgain = false;
let previewRevision = 0;
async function refreshSkinResources() {
  if (resourceRefreshRunning) { resourceRefreshAgain = true; return; }
  resourceRefreshRunning = true;
  try {
    do {
      resourceRefreshAgain = false;
      await fillSkinSelect();
      previewRevision++;
      if (detailLoaded && detailPanelOpen()) await loadDetail({ quiet: true });
      else renderPreview();
      await window.__TAURI__.event.emitTo("main", "skin-resources-refresh");
    } while (resourceRefreshAgain);
  } catch (error) {
    console.warn("[skin-resources-refresh]", error);
  } finally {
    resourceRefreshRunning = false;
  }
}

function fillAbout() {
  $("version").textContent = data.version ? `v${data.version}` : "";
}

function showTab(name) {
  const btn = document.querySelector(`#tabs button[data-tab="${name}"]`);
  if (btn) btn.click();
}

function wire() {
  for (const link of document.querySelectorAll("[data-bundled-license]")) {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      try { await inv("open_bundled_license"); }
      catch (error) { settingError("license-open-failed", error); }
    });
  }
  document.querySelectorAll("a[data-external-url]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      inv("open_url", { url: link.href }).catch(console.error);
    });
  });
  wireHelp();
  window.addEventListener("focus", refreshSkinResources);
  window.addEventListener("focus", refreshAutostart);
  $("folders-scan").addEventListener("click", async () => {
    await folderWrite;
    $("folders-error").hidden = true;
    $("folders-scan").disabled = true;
    scanTimer = setTimeout(() => {
      $("folders-scan").disabled = false;
      folderError(t("folders-failed"));
    }, 10000);
    try { await window.__TAURI__.event.emitTo("main", "scan-working-agents"); }
    catch (e) { clearTimeout(scanTimer); $("folders-scan").disabled = false; folderError(e); }
  });
  $("folders").addEventListener("focusout", () => {
    setTimeout(() => {
      if (!$("folders").contains(document.activeElement)) fillFolders();
    }, 0);
  });
  for (const btn of document.querySelectorAll("#tabs button")) {
    btn.addEventListener("click", () => {
      for (const b of document.querySelectorAll("#tabs button")) b.classList.toggle("active", b === btn);
      for (const page of document.querySelectorAll(".page")) page.hidden = page.id !== `page-${btn.dataset.tab}`;
      document.querySelector("main").classList.toggle("style-scroll", btn.dataset.tab === "style" || btn.dataset.tab === "about");
    });
  }
  if (window.__TAURI__) {
    window.__TAURI__.event.listen("system-apply-failed", (e) => {
      const changed = e.payload.map((issue) => issue.field);
      data.system_unknown = [...new Set([...(data.system_unknown || []).filter((field) => !changed.includes(field)), ...e.payload.filter((issue) => issue.unknown).map((issue) => issue.field)])];
      showSystemStatus();
      showSystemFailures(e.payload);
    });
    window.__TAURI__.event.listen("prefs-changed", (e) => {
      if (prefs && e.payload?.prefs) {
        prefs.muted = e.payload.prefs.muted === true;
        if (savedPrefs) savedPrefs.muted = prefs.muted;
        if (requestedPrefs) requestedPrefs.muted = prefs.muted;
      }
    });
    window.__TAURI__.event.listen("settings-tab", (e) => showTab(e.payload));
    window.__TAURI__.event.listen("folder-scan-result", (e) => {
      clearTimeout(scanTimer);
      $("folders-scan").disabled = false;
      if (e.payload.error) folderError(e.payload.error);
    });
    window.__TAURI__.event.listen("folder-names-changed", (e) => {
      data.folder_names = e.payload;
      data.known_folders = Object.keys(e.payload);
      if (!$("folders").contains(document.activeElement)) fillFolders();
    });
    window.__TAURI__.event.listen("skins-changed", () => {
      if (detailLoaded) loadDetail({ quiet: true });
    });
    window.__TAURI__.event.listen("sounds-changed", () => {
      if (detailLoaded) loadDetail({ quiet: true });
    });
  }
  $("language").addEventListener("change", async (e) => {
    prefs.language = e.target.value;
    lang = prefs.language === "en" ? "en" : "zh";
    if (!await savePrefs()) return;
    applyText();
    fillGlobal();
    fillStyle();
    if (detailLoaded) renderDetail();
  });
  $("time").addEventListener("change", (e) => ((prefs.time = e.target.value), savePrefs()));
  $("size").addEventListener("change", (e) => ((prefs.size = e.target.value), savePrefs()));
  $("pin").addEventListener("change", (e) => ((prefs.pin = e.target.value), savePrefs()));
  $("remember").addEventListener("change", (e) => ((prefs.remember_position = e.target.checked), savePrefs()));
  $("autostart").addEventListener("change", (e) => saveAutostart(e.target));
  $("taskbar").addEventListener("change", (e) => ((prefs.hide_from_taskbar = e.target.checked), savePrefs()));
  $("ds").addEventListener("change", (e) => saveFlag(e.target, "ds_price_set", "ds_price"));
  $("privacy").addEventListener("change", (e) => saveFlag(e.target, "bubble_set_privacy", "privacy"));
  $("stuck-reminder").addEventListener("change", (e) => {
    prefs.stuck_reminder = e.target.checked;
    $("stuck-minutes").disabled = !e.target.checked;
    savePrefs();
  });
  $("stuck-minutes").addEventListener("change", (e) => {
    const n = Number(e.target.value);
    if (!Number.isInteger(n) || n < 1 || n > 1440) {
      e.target.value = prefs.stuck_minutes || 10;
      return;
    }
    prefs.stuck_minutes = n;
    savePrefs();
  });
  $("volume").addEventListener("input", (e) => {
    const n = Number(e.target.value);
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      e.target.value = Number.isInteger(prefs.volume) ? prefs.volume : 70;
      paintRange(e.target);
      return;
    }
    paintRange(e.target);
    prefs.volume = n;
    savePrefs();
  });
  $("status-open").addEventListener("click", () => inv("open_status_folder").catch(() => {}));
  $("detail-open").addEventListener("click", () => {
    const panel = $("detail-panel");
    panel.hidden = !panel.hidden;
    syncDetailHints();
    if (!panel.hidden) openDetail();
  });
  $("ok").addEventListener("click", () => window.__TAURI__.window.getCurrentWindow().close());
  $("signals-toggle").addEventListener("click", () => {
    signalsOpen = !signalsOpen;
    syncSignalsButton();
    fillSignals();
  });
  window.__TAURI__.event.listen("signal-logged", () => fillSignals());
  for (const [id, kind, missingId] of [
    ["store-settings", "settings", "store-settings-missing"],
    ["store-cache", "cache", "store-cache-missing"],
  ]) {
    $(id).addEventListener("click", async () => {
      const exists = await inv("open_data_folder", { kind }).catch(() => false);
      const node = $(missingId);
      if (node) node.hidden = !!exists;
    });
  }
}

let rows = [];
let skins = null;
let skinsAvailable = [];
let detailSkin = "";
let detailGeneration = 0;
let preview = null;
const previewUrl = (skin, file) =>
  `http://127.0.0.1:47621/skin/${[skin, ...file.split("/")].map(encodeURIComponent).join("/")}${previewRevision ? `?refresh=${previewRevision}` : ""}`;

function iconButton(icon, label, disabled = false) {
  const button = el("button", { type: "button", className: "btn-icon filled", disabled, title: label });
  button.setAttribute("aria-label", label);
  if (icon && !disabled) button.append(el("img", { src: `assets/ui/icon_${icon}.png`, alt: "" }));
  return button;
}

function previewFiles(info) {
  if (!info.chosen) return info.used || [];
  if (info.chosen.endsWith("/")) return info.files.filter((file) => file.startsWith(info.chosen));
  return info.files.includes(info.chosen) ? [info.chosen] : [];
}

function previewButton(info) {
  const files = previewFiles(info);
  const button = iconButton("view", `${t("preview-image")} · ${t(`row-${info.id}`)}`, !files.length || info.enabled === false);
  button.addEventListener("click", () => {
    preview = { skin: detailSkin, row: info.id, kind: info.kind, files: files.slice(), index: 0 };
    renderPreview();
  });
  return button;
}

function renderPreview() {
  const box = $("skin-preview");
  if (!box) return;
  box.hidden = !detailPanelOpen();
  if (!preview) {
    box.replaceChildren(el("div", { className: "preview-empty" },
      el("span", {}, t("preview-before")),
      el("img", { className: "preview-icon", src: "assets/ui/icon_view.png", alt: "" }),
      el("span", {}, t("preview-after"))));
    return;
  }
  const file = preview.files[preview.index];
  if (preview.kind === "rig" && preview.files.length) {
    const layers = el("div", { className: "preview-rig" });
    for (const part of preview.files) layers.append(el("img", { src: previewUrl(preview.skin, part), alt: part }));
    box.replaceChildren(el("div", { className: "preview-stage" }, layers), el("div", { className: "preview-caption" }, `${t("preview-label")}idle_rig (folder)`));
    return;
  }
  const picture = el("img", { className: "preview-picture", src: previewUrl(preview.skin, file), alt: file });
  const stage = el("div", { className: "preview-stage" });
  const previous = iconButton(null, t("preview-prev"));
  const next = iconButton(null, t("preview-next"));
  previous.textContent = "‹";
  next.textContent = "›";
  for (const [button, step] of [[previous, -1], [next, 1]]) {
    button.addEventListener("click", () => {
      preview.index = (preview.index + step + preview.files.length) % preview.files.length;
      renderPreview();
    });
  }
  const multiple = preview.files.length > 1;
  if (multiple) stage.append(previous);
  stage.append(picture);
  if (multiple) stage.append(next);
  picture.addEventListener("error", () => picture.replaceWith(el("span", { className: "preview-error" }, t("preview-error"))));
  box.replaceChildren(stage, el("div", { className: "preview-caption" }, `${t("preview-label")}${file}`));
}

const currentSkin = () => ($("skin") && $("skin").value) || (prefs && prefs.skin) || "";

async function loadDetail(options) {
  const generation = ++detailGeneration;
  if (!options?.quiet) $("detail-panel").replaceChildren(el("div", { className: "muted" }, "…"));
  const skin = currentSkin();
  const [nextRows, nextSounds] = await Promise.all([
    inv("skin_rows", { folder: skin || null }).catch(() => []),
    inv("skin_sound_rows", { folder: skin || null }).catch(() => null),
  ]);
  if (generation !== detailGeneration || skin !== currentSkin()) return;
  if (detailSkin !== skin) preview = null;
  detailSkin = skin;
  rows = nextRows;
  sounds = nextSounds;
  if (preview) {
    const info = rows.find((row) => row.id === preview.row);
    const files = info ? previewFiles(info) : [];
    const index = files.indexOf(preview.files[preview.index]);
    preview = files.length ? { ...preview, kind: info.kind, files, index: Math.max(0, index) } : null;
  }
  const scroll = [document.querySelector("main"), document.querySelector("#page-style > .col.right")]
    .filter(Boolean).map((node) => ({ node, top: node.scrollTop, left: node.scrollLeft }));
  renderDetail();
  renderPreview();
  for (const { node, top, left } of scroll) { node.scrollTop = top; node.scrollLeft = left; }
}

let sounds = null;

function soundRow(info) {
  const image = rows.find((r) => r.id === info.id);
  if (image && image.enabled === false) {
    const mute = iconButton("sound", `${t("sound-preview")} · ${t(`row-${info.id}`)}`, true);
    return el("div", { className: "detail-row off" }, mute, el("span", { className: "name" }, t(`row-${info.id}`)), offText());
  }
  const play = iconButton("sound", `${t("sound-preview")} · ${t(`row-${info.id}`)}`, !info.files.length);
  play.addEventListener("click", async () => {
    try {
      await window.__TAURI__.event.emitTo("main", "preview-skin-sound", { skin: detailSkin, row: info.id });
    } catch (error) {
      console.warn("[sound-preview]", error);
      let message = $("sound-preview-error");
      if (!message) {
        message = el("div", { id: "sound-preview-error", className: "small-note", role: "status" });
        $("detail-panel").append(message);
      }
      message.textContent = t("sound-preview-error");
    }
  });
  const fileItem = (f) => ({ value: `file:${f}`, label: f });
  const groups = [
    [{ value: "", label: t("sound-none") }, ...sounds.files.filter((f) => !f.includes("/")).map(fileItem)],
    sounds.folders.map((f) => ({ value: `folder:${f}`, label: `${f}/` })),
    sounds.files.filter((f) => f.includes("/")).map(fileItem),
  ];
  const value = info.type === "none" ? "" : `${info.type}:${info.name}`;
  if (value && !groups.some((group) => group.some((it) => it.value === value))) {
    const label = `${info.name}${info.type === "folder" ? "/" : ""} (missing)`;
    const group = info.type === "folder" ? 1 : info.name.includes("/") ? 2 : 0;
    groups[group].push({ value, label, disabled: true });
  }
  const save = (choice) => saveDetail("skin_sound_choice", { row: info.id, skin: detailSkin, choice });
  const select = pickList(groups, value, (v) =>
    save(v ? { type: v.slice(0, v.indexOf(":")), name: v.slice(v.indexOf(":") + 1) } : { type: "none", name: "" }),
  );
  const remove = el("button", { type: "button", className: "btn-icon", title: t("sound-remove") }, "×");
  remove.hidden = info.type === "none";
  remove.addEventListener("click", () => save({ type: "none", name: "" }));
  return el("div", { className: "detail-row" }, play, el("span", { className: "name" }, t(`row-${info.id}`)), select, remove);
}

function soundCol() {
  if (!sounds || !sounds.rows.length) return null;
  const reset = el("button", { type: "button", className: "btn" }, t("sound-reset"));
  reset.addEventListener("click", () => saveDetail("skin_sound_reset", { skin: detailSkin }));
  return el(
    "div",
    { className: "sound-cols" },
    el("div", { className: "split-head sound-title" }, el("span", {}, t("sounds-title")), soundRepeatControl()),
    ...sounds.rows.map(soundRow),
    el("div", { className: "row" }, reset),
  );
}

function soundRepeatControl() {
  const enabled = prefs.sound_repeat_guard !== false;
  const seconds = Number.isInteger(prefs.sound_repeat_seconds) ? Math.max(1, prefs.sound_repeat_seconds) : 10;
  const check = el("input", { id: "sound-repeat-guard", type: "checkbox", checked: enabled });
  check.setAttribute("aria-label", t("sound-repeat-label"));
  const number = el("input", { type: "number", min: "1", max: "4294967295", step: "1", value: seconds, disabled: !enabled });
  number.setAttribute("aria-label", t("sound-repeat-seconds"));
  check.addEventListener("change", () => {
    prefs.sound_repeat_guard = check.checked;
    number.disabled = !check.checked;
    savePrefs();
  });
  number.addEventListener("change", () => {
    const n = Number(number.value);
    if (!Number.isInteger(n) || n < 1 || n > 4294967295) {
      number.value = prefs.sound_repeat_seconds || 10;
      return;
    }
    prefs.sound_repeat_seconds = n;
    savePrefs();
  });
  const label = el("label", { className: "row check" }, check);
  label.append(el("span", {}, t("sound-repeat-before")));
  return el("div", { className: "sound-repeat" }, label, number, el("label", { htmlFor: check.id }, t("sound-repeat-after")));
}

function rowSwitch(info) {
  if (!info.skippable) return el("span", { className: "switch-slot" });
  const on = info.enabled !== false;
  const button = el("button", { type: "button", className: "switch" });
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", on ? "true" : "false");
  button.setAttribute("aria-label", `${t("row-switch")} · ${t(`row-${info.id}`)}`);
  button.addEventListener("click", () =>
    saveDetail("skin_row_enabled", { row: info.id, skin: detailSkin, enabled: !on }),
  );
  return button;
}

const offText = () => el("span", { className: "detail-used" }, t("row-off"));

function detailRow(info) {
  if (info.enabled === false) {
    return el(
      "div",
      { className: "detail-row off" },
      rowSwitch(info),
      previewButton(info),
      el("span", { className: "name" }, t(`row-${info.id}`)),
      offText(),
    );
  }
  if (info.status === "own") {
    return el(
      "div",
      { className: "detail-row" },
      rowSwitch(info),
      previewButton(info),
      el("span", { className: "name" }, t(`row-${info.id}`)),
      el("span", { className: "detail-used", title: info.used.join("\n") }, info.display),
    );
  }
  const select = el("select");
  select.append(el("option", { value: "", disabled: true }, info.missing_label));
  for (const f of info.files) select.append(el("option", { value: `file:${f}` }, f));
  for (const f of info.folders) select.append(el("option", { value: `folder:${f}` }, `${f}/`));
  const valueOf = (name) => (name.endsWith("/") ? `folder:${name.slice(0, -1)}` : `file:${name}`);
  const chosenValue = info.chosen ? valueOf(info.chosen) : info.fallback_value || "";
  select.value = chosenValue;
  const missingChoice = !!chosenValue && select.value !== chosenValue;
  if (missingChoice) {
    select.append(el("option", { value: chosenValue, disabled: true }, `${info.chosen || chosenValue.slice(chosenValue.indexOf(":") + 1)} (missing)`));
    select.value = chosenValue;
  }
  select.classList.toggle("missing", !chosenValue || missingChoice);
  select.addEventListener("change", async () => {
    const v = select.value;
    const choice = v ? { type: v.slice(0, v.indexOf(":")), name: v.slice(v.indexOf(":") + 1) } : null;
    await saveDetail("skin_choice", { row: info.id, skin: detailSkin, choice }, () => { select.value = chosenValue; });
  });
  const reset = el("button", { type: "button", className: "btn-icon", title: t("skin-reset") }, "×");
  reset.hidden = !info.chosen;
  reset.addEventListener("click", async () => {
    await saveDetail("skin_choice", { row: info.id, skin: detailSkin, choice: null });
  });
  const row = el("div", { className: "detail-row" }, rowSwitch(info), previewButton(info), el("span", { className: "name" }, t(`row-${info.id}`)), select, reset);
  enhanceSelect(select);
  return row;
}

function renderDetail() {
  const list = el("div", { className: "detail-cols" });
  rows.forEach((info) => list.append(detailRow(info)));
  const open = el("button", { type: "button", className: "btn" }, t("skin-open"));
  open.addEventListener("click", () => inv("open_skins_folder", { folder: detailSkin }).catch(() => {}));
  const mine = skinsAvailable.find((s) => s.value === detailSkin) || skinsAvailable[0];
  const credits = (mine && mine.credits) || [];
  const lines = credits.length
    ? el(
        "div",
        { className: "skin-credits" },
        ...credits.map((line) => el("div", {}, line)),
      )
    : null;
  $("detail-panel").replaceChildren(
    el("div", { className: "section-title" }, mine ? `${t("skin-title")} · ${mine.label}` : t("skin-title")),
    ...(lines ? [lines] : []),
    el(
      "div",
      { className: "detail-split" },
      el("div", { className: "detail-cols" }, el("div", { className: "split-head" }, open), list),
      ...[soundCol()].filter(Boolean),
    ),
  );
}

function detailPanelOpen() {
  const panel = $("detail-panel");
  return !!panel && !panel.hidden;
}

function syncDetailHints() {
  const open = detailPanelOpen();
  const previewBox = $("skin-preview");
  if (previewBox) previewBox.hidden = !open;
  for (const id of ["detail-guide"]) {
    const node = $(id);
    if (node) node.hidden = open;
  }
  const btn = $("detail-open");
  if (btn) btn.textContent = t(open ? "detail-show-hint" : "detail");
}

let detailLoaded = false;
async function openDetail() {
  const quiet = detailLoaded;
  detailLoaded = true;
  await loadDetail({ quiet });
}

(async function boot() {
  for (const id of ["language", "time", "size", "pin", "skin", "status"]) if ($(id)) enhanceSelect($(id));
  data = await inv("settings_init");
  prefs = data.prefs;
  savedPrefs = { ...prefs };
  skins = await inv("skins_list").catch(() => null);
  skinsAvailable = (await inv("skins_available").catch(() => null)) || [];
  lang = prefs.language === "en" ? "en" : "zh";
  await refreshAutostart();
  applyText();
  fillGlobal();
  fillStyle();
  fillAbout();
  wire();
  const wanted = await inv("settings_take_tab").catch(() => null);
  if (wanted) showTab(wanted);
})();
