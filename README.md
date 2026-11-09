# 游戏工坊 · Game workshop

**在 DeepSeek Harness 里，先玩一局，再用对话做自己的游戏。**

`dsh-game-workshop` · **0.1.0** · **MIT** · 实测宿主 **DSH 0.2.2-rc.1**

![真实 DSH 侧栏中的雾岭灵契试玩](<docs/images/dsh-workshop.png>)

> 上图由真实 DSH Web 测试配置中安装的打包产物截取，不是仿造宿主外壳的效果图。游戏无需模型 API、编辑器或额外账号即可试玩；在对话中生成游戏则需要可用的 DSH 模型。

## 能做什么

- 侧栏新增 **「游戏工坊 / Game workshop」**，跟随 DSH 中英文语言设置。
- 内置原创中文卡牌游戏 **《雾岭灵契》**：6 种灵兽、种子随机抽卡、三张同种同星卡合成、4 件灵器、4 人出阵、三个逐步解锁的秘境、自动回合战斗与战报。
- 开局有三张青岚鹿，可立即体验合成。默认游戏无需付费、联网或刷资源即可通关。
- **「开始试玩」**直接在 DSH 内打开游戏；**「下载游戏 HTML」**导出可离线玩的单文件。
- `game_workshop_create_cards` 在当前会话工作目录创建自定义 HTML，**不覆盖任何现有文件、目录或链接**。
- `game_workshop_editors` 列出当前会话真实发现的工具，并在每次编辑前只读核对目标工程/场景。
- 三个独立的官方编辑器 MCP 连接预设，**安装时全部关闭**。复用 DSH 自带 MCP 客户端，不另写一套客户端。

卡面、图标和山景是本项目原创 SVG 图形，不使用宝可梦、阴阳师或其他游戏素材。卡牌游戏与插件自身没有 CDN、遥测、远程字体和游戏资源请求。另行启用的编辑器及其 CLI 有各自的联网与隐私设置，不能把本地 MCP 传输等同于完全离线。

## 安装

### macOS 桌面版：本项目验证的安装方式

在终端执行：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop add 'github:a348579184/dsh-game-workshop#v0.1.0'
```

这条命令使用桌面版自带的 CLI，**不要求 `dsh` 已加入 PATH**。应用安装在其他位置时，相应调整应用路径。若已经安装了桌面 CLI 快捷命令，可把前面的完整路径替换为 `dsh`。

安装后刷新当前 DSH 页面，从左侧打开 **游戏工坊**。首次新增 bundle 可以由宿主加载；**更新已有安装时请重启对应 DSH profile / 桌面应用，再刷新页面**，不要依赖旧模块缓存。这里不要求开发服务器或客户端热更新 watcher。

### Web profile

```sh
dsh plugin --profile web add 'github:a348579184/dsh-game-workshop#v0.1.0'
dsh --profile web
```

也可在 DSH 插件管理界面的社区包安装入口，使用同一 GitHub 安装标识。选择你实际使用的 profile，不要把 `web` 与桌面 `desktop` 混用。

### Release 安装包

从 [v0.1.0 Release](<https://github.com/a348579184/dsh-game-workshop/releases/tag/v0.1.0>) 下载 `dsh-game-workshop-0.1.0.tgz`，然后把上述安装命令末尾的 GitHub 标识换成本机 tarball 的绝对路径。例如 Web profile：

```sh
dsh plugin --profile web add /absolute/path/dsh-game-workshop-0.1.0.tgz
```

Release 同时提供 SHA-256 校验文件。仓库与安装包均包含[已构建客户端](<dist/client.js>)，没有 `postinstall` / `prepare` 等安装脚本，安装不需要编译、不安装编辑器，也不自动启用 MCP。

### 兼容性

使用此版官方支持的[包清单](<package.json>) `dsh.bundle.patch`、[Cordis 补丁](<cordis.patch.yml>)、`window.__ModuleLoader__.load()`、`main` / `sidebar.panellist` 槽位、locale 服务与原生工具注册。

声明范围为 `>=0.2.2-rc.1 <0.3.0`，**实际验收版本只有 0.2.2-rc.1**。DSH 0.2 仍为预览接口；其他版本需重跑测试，不建议为版本不匹配强行添加豁免。

## 试玩与离线存档

1. 打开 **游戏工坊 → 开始试玩**。
2. 点击 **「青岚鹿 ×3 → 2★」**完成第一次升星。
3. 把赤金牙佩给烬尾狐、凝露护符给玄苔龟，点击 **自动布阵**，挑战「苔径初行」。
4. 首通奖励会给同名卡与新灵器；继续合成、装备，再挑战「月溪回响」「云巅归契」。战斗会自动推进，可加速或查看结果。

**两种下载的区别：**

- 工坊页的 **下载游戏 HTML**：下载一份全新样例。
- 游戏内右上角的 **离线珍藏**：下载同一个游戏，**同时嵌入当前存档**，适合备份或换设备。

下载后直接用浏览器打开 HTML，不需要服务端或网络。进度保存在 `localStorage`；DSH 内、离线文件、不同浏览器/配置拥有各自的存档空间。通常需要在同一浏览器和同一文件路径重新打开才能自动恢复。隐私模式或限制 `file://` 存储的浏览器可能不允许持久保存，此时页面会明确提示；可用游戏内下载把进度嵌入 HTML。清除浏览器数据会清除自动存档。重置需在游戏内确认。

## 在对话中制作自己的游戏

先在 DSH 中选择工作区，再复制侧栏中可编辑的中文指令到对话。例如：

> 请调用 game_workshop_create_cards，在当前工作区新建《星海灵契》。卡组使用星鲸、月狐、晶鹿、云鹤、岩龟、萤蝶，请给出原创中文描述。种子为「星海-2026」，文件名为「星海灵契.html」。如文件已存在，请让我换名，不要覆盖。

工具参数示例：

```json
{
  "title": "星海灵契",
  "cards": [
    { "name": "星鲸", "description": "在星潮中听见远方的回声。", "attack": 28, "health": 120, "color": "#82c8e5" },
    { "name": "月狐", "description": "把一束月光藏进尾尖。" }
  ],
  "seed": "星海-2026",
  "filename": "星海灵契.html",
  "language": "zh"
}
```

- `title` 最多 80 字；`cards` 为 1–6 种卡牌，依序覆盖六个原创模板，未覆盖者保留默认值。名称最多 32 字、描述最多 160 字。
- `attack` 限制到 12–45，`health` 限制到 60–180；颜色仅接受 `#RRGGBB`。自定义极端数值可能改变通关难度。
- `seed` 接受字符串或数字；相同配置与操作序列得到相同结果。
- `language` 为 `zh` 或 `en`，默认中文。标题、卡组、种子和语言共同区分存档。
- `filename` 只能是当前目录下的 `.html` 文件名，不接受目录、路径穿越或特殊设备名。
- 使用 **DSH 当前会话的文件系统、工作目录和 sandbox policy**；没有直接通过 Node 文件接口绕过宿主权限。
- 先检查文件/链接，再通过宿主的 **`createIfAbsent` 原子写入**防止并发覆盖。已存在时返回换名提示，不重命名旧文件、不覆盖、不静默另存。
- 返回可打开的绝对路径与字节数；标题和卡牌文字经过转义，生成的 HTML 不加载远程代码。

这是卡牌游戏模板生成器，不是承诺支持任意规则的通用游戏引擎。可在[游戏源码](<game/engine.js>)和[渲染器](<game/render.js>)基础上继续开发。

## 本机编辑器接入

完整官方来源、安装前提、配置和安全说明见[编辑器接入文档](<docs/editors.md>)。**无需编辑器也能使用全部卡牌功能。**

| 预设 | 官方实现 | 传输 | 安装默认状态 |
| --- | --- | --- | --- |
| `game-workshop-unity` | Unity CLI 的 `unity mcp --project-path … --cli-tools` | stdio | 关闭 |
| `game-workshop-unreal` | UE 5.8 Unreal MCP（Experimental） | 本机 Streamable HTTP，`http://127.0.0.1:8000/mcp` | 关闭 |
| `game-workshop-blender` | Blender Lab 官方 MCP Server + 官方加载项，Blender 5.1+ | stdio，可指定服务可执行文件绝对路径 | 关闭 |

预设已经包含在主 bundle 中。请在 DSH 对应插件设置里**先填写真实路径/配置，再单独启用所需条目**，不要重复导入[预设源文件](<editors/presets.patch.yml>)。Unity 项目路径是 CLI 参数与 `cwd`；Blender 使用官方来源安装的服务绝对路径，不要因为名称同为 `blender-mcp` 就换成第三方包。所有编辑器进程只在你启用连接后才可能启动。

### 先发现，再核对，最后编辑

```json
{ "action": "list" }
```

传给 `game_workshop_editors` 的上述参数会返回当前会话真实注册的工具及 schema。**注册过不等于连接当前仍可用**；连接失效会在实际只读探测时报告。

```json
{ "action": "inspect", "editor": "blender" }
```

`inspect` 可取得当前已保存 `.blend` 文件身份。**Unity 默认仅列出就绪工程，不证明连接所选目标，也不能据此编辑。** Unity 编辑需在主插件配置里提供人工审核的 `unityProbe`，只读查询实际所选工程并提取唯一绝对路径；不能从全局项目列表任取一个路径。

修改前调用 `prepare`，指定 `editor`、`expected_project`、实际发现的 `next_tool` 与完整 `next_arguments`；然后才能尝试那一次精确调用。确认绑定当前 Agent、工具实例、参数和取消信号，60 秒过期、一次性消费；新的检查会撤销旧确认，每次编辑前重新只读查询。所有调用仍经过正常 DSH 权限；该步骤不授予额外权限。

本版遇到宿主不支持的 MCP schema 约束会拒绝调用，不静默忽略。PTC 模式下，prepare 与编辑必须在同一次 `run_code` 中顺序执行；程序结束会撤销该次确认。

UE 的工具随 Toolsets 变化，官方页面未保证一个固定工程查询。`list_toolsets` / `describe_toolset` 只是元数据，`call_tool` 是通用分发器，**不能默认当作只读**。须在主「游戏工坊」配置里提供经审核的 `unrealProbe`（`tool`、固定 `arguments`、`identityPointer`、`auditedReadOnly`）。未配置或目标无法核对时拒绝编辑。详见[具体配置与限制](<docs/editors.md>)。

### 跨工具用例：Blender 透明装备图 → 指定 Unity 工程的装备卡

可以把下面的任务交给 DSH，替换成你自己的真实路径：

> 使用游戏工坊连接，先发现实际 Blender 和 Unity 工具。Unity 必须先配置已审核的 unityProbe；只有 unity-status 项目列表时停止，不擅自猜当前目标。只读确认 Blender 当前文件是 `/Projects/CardArt/equipment.blend`，Unity 工程是 `/Projects/MistCards`，不匹配就停止。先在 Blender 临时场景中制作原创「听风铃」装备，设置透明世界背景、RGBA PNG、1024×1024，渲染到新的 `/Projects/CardArt/exports/wind-bell.png`。每次修改前都用 `game_workshop_editors` prepare 精确调用。渲染完成后检查文件确有透明通道。再只读核对目标 Unity 工程，通过实际发现的导入工具导入到新的 `Assets/Cards/Equipment/WindBell.png`，设为 Sprite，创建装备卡数据与预览 UI（攻击 +8、生命 +25、护甲 +2），保存并查看 Console。不要覆盖同名资产，不要切换或修改其他已打开工程。长时间渲染若超时，先只读检查状态，不要重复执行。

流程中的编辑工具名称和参数以发现结果为准，不假定所有版本都有同一套 `execute_python` / 导入工具。Blender 与 Unity 修改都需保留你自己的工程备份；MCP 并不是编辑器沙箱。这个跨工具用例是**使用指导，未在本机真实编辑器中联调**。

## 验证情况

详细过程与实测环境见[验收记录](<docs/verification.md>)。

| 层次 | 范围 | 状态 |
| --- | --- | --- |
| 游戏规则与安全 | 6 灵兽、抽卡、合成、装备、关卡、100 个种子默认无刷取通关、存档及 HTML 注入边界 | 自动化测试覆盖 |
| 真实 DSH 服务 | Session、工作目录、文件系统、sandbox、工具注册/执行、并发同名不覆盖 | 自动化集成测试覆盖 |
| 真实 DSH UI | 打包安装、侧栏、试玩、下载、三关、刷新、离线 HTML、中英文与窄屏 | 浏览器验收，见记录 |
| Unity / Blender stdio | DSH 实际 MCP 客户端 + 本地测试服务 | **协议已验证** |
| UE Streamable HTTP | DSH 实际 MCP 客户端 + 本机临时 HTTP 测试服务 | **协议已验证** |
| 真实 Unity / UE / Blender | 常见应用位置和 PATH 未发现可用安装；没有操作任何真实工程 | **真实编辑器未验证** |

协议测试不等于编辑器安装、渲染、导入或工具 schema 的真实验收。没有把模拟响应、预计可用的工具或连接预设写成真实编辑器成功记录。

## 开发与复测

```sh
npm ci --ignore-scripts
npm run build
npm test
```

构建脚本生成[客户端产物](<dist/client.js>)及[主补丁](<cordis.patch.yml>)，发布时必须一起提交。集成测试使用本机官方 DSH 0.2.2-rc.1 运行时：

```sh
DSH_TEST_RUNTIME=/absolute/path/to/dsh-runtime npm test
```

该目录应有 `node_modules/@deepseek-ai/dsh-tools` 等官方包。没有运行时时相关测试会**明确 skip**，不能当成已经完成 DSH 验收；本项目发布验收使用真实运行时且无相关 skip。桌面应用的 ASAR 内部路径不是普通 Node 文件系统目录，需使用自己的解包检查副本或官方 Node 运行时目录。测试不会把宿主代码复制进插件。

浏览器测试在**独立测试 profile**安装打包产物、启动真实 `dsh web` 后执行：

```sh
DSH_TEST_URL='http://127.0.0.1:PORT/?token=TEST_PROFILE_TOKEN' \
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
node tests/ui.e2e.mjs
```

测试使用独立浏览器上下文，不需要生产模型凭据；测试 URL 的 token 不应提交仓库。测试截图、报告和下载文件写入被 Git 忽略的 `.test-artifacts` 目录。MCP fixture 仅绑定 loopback 或使用 stdio，并在结束时关闭进程和连接。

源码导航：[宿主入口](<index.js>) · [文件生成](<host/create-cards.js>) · [编辑器检查](<host/editor-policy.js>) · [客户端](<client/index.js>) · [游戏规则](<game/engine.js>) · [测试](<tests/game.test.mjs>)

## 许可

插件源码、原始图形和生成游戏模板采用 [MIT License](<LICENSE>)。独立 HTML 内也保留完整 MIT 声明。Unity、Unreal、Blender 及其 MCP 组件遵守各自许可；本插件不分发这些编辑器。
