# status/ · 状态提示

小猫下面那行字从这里读。在 Settings → 风格化 → 状态提示 里选一种，或者选“关闭”。内置“默认”在程序里，不在这个文件夹里。

## 一份提示，一个文件

复制 meow.txt，改成自己的文件名（例如 test.txt），用 UTF-8 保存。中英文写在同一个文件里：

```text
名字 = 我家的猫
name.en = My cat
idle = 咪~* | 喵…
idle.en = Mew~* | Mrr...
poked = (｀⌣  ´ )ʃ
typing.en = Busy paws
thinking =
```

- 名字写“名字 = …”，英文名写“name.en = …”；旧的 name 名字别名仍认，名字.en 也认。没写名字时，下拉用文件名。
- 每句一行，英文紧跟同名加 .en 的一行。键名按 Settings 图片文件名，不带 .png：idle、onit、thinking、overthinking、reading、typing、running、notify、error、poked、bored、yawn、wake、grab、done、angry、sleep。
- bored 共用原 look1～4 的句子，sleep 共用原 sleep1～4 的句子；call 已不再触发，样板只把原句作为注释保存。气泡专用 need_you 保留。旧状态键仍兼容；同一来源新旧键同时写时，新键优先。语言来源优先级仍按下节执行。
- 没有 .en 行，两种界面共用无后缀行；只有 .en 行，中文也用它。
- 两行都没有，使用当前语言的内置默认。所用行等号右边留空，也用默认（不会借另一行）。
- 用 | 分隔候选句；同一个显示状态里保留一句，换状态或重读提示再随机挑。
- # 开头是说明行。文字不按字符数截断，放不下会出省略号，尽量写短。
- 保存后退出桌宠再打开，不用重装。

## 旧文件仍然能用

旧的 xxx.txt + xxx.en.txt 仍照原来按整份语言读取：当前语言文件不存在或没有有效名字，就用另一份；选中那份缺句用当前语言的内置默认。

主文件出现任意 .en 行（包括 name.en）就启用逐句规则；没有旧英文文件时也使用逐句规则。混用时：

- 英文：同文件 .en 行 > 旧 xxx.en.txt 对应句 > 无后缀行。
- 中文：无后缀行 > 同文件 .en 行 > 旧英文文件对应句。
- 显式留空的行也占优先级，表示用默认，不继续借下一份。
- 名字按相同顺序找非空值；没有就用文件名。

不用把用户已有的旧文件改名或删掉，程序不会自动迁移、覆盖它们。

## 文件夹在哪儿

- Windows：exe 旁边的 status/。
- Mac：~/Library/Application Support/com.aegithalos.hereness/status/。
- 开发版：项目里的 status/。
- 设置里点“打开状态提示文件夹”就能找到。
- 文件夹不存在或没有 txt，就用内置默认；选中的文件不在也回默认。

举手气泡的“[名字] 找你”也可以写：need_you = 找你，英文写 need_you.en = needs you!。两行都没写就用内置默认。
