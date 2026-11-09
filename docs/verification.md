# v0.1.0 验收记录

日期：**2026-11-09**。本文区分实际 DSH / 浏览器测试、协议测试与未完成的真实编辑器联调，不把 fixture 当作编辑器。

## 环境与产物

- macOS **26.5.2**（25F84），arm64。
- 真实已安装 DSH **0.2.2-rc.1**；使用桌面应用自带 CLI。
- 自动化测试 Node **22.22.1**；Playwright **1.65.0**，系统 Google Chrome **157.0.8103.38**。
- 包 `dsh-game-workshop@0.1.0`，MIT。构建使用固定版本 esbuild **0.28.2**。
- 独立 `DSH_HOME` 与 `game-workshop-test` profile，loopback Web 服务；没有把开发服务器冒充 DSH，也没有修改应用 ASAR。
- 宿主 API 查阅来自此版本官方安装包的只读解包检查副本；宿主代码、缓存和凭据均不进入本仓库。
- 最终 tarball、SHA-256 与公开安装验证结果随 [v0.1.0 Release](<https://github.com/a348579184/dsh-game-workshop/releases/tag/v0.1.0>) 发布。

仓库提交[预构建客户端](<../dist/client.js>)，GitHub 安装不需运行构建脚本。安装包无运行时 npm 依赖和安装生命周期脚本；测试工具仅是开发依赖。

## 1. 自动化：58 项通过，0 失败，0 跳过

```sh
npm run build
npm run check
npm test
```

这里的数量包含 Node test runner 的子测试，**不是只报顶层 case 数**。发布验收实际加载了官方 DSH 运行时；无运行时时部分测试会明确 skip，不能复用本文数字声称通过。

| 测试 | 数量 | 实际覆盖 |
| --- | ---: | --- |
| [游戏规则与渲染](<../tests/game.test.mjs>) | 15 | 六灵兽、同种同星三合一、种子抽取、装备数值与转移、阵容、三关解锁、首次奖励、失败不扣资源；100 个种子无需抽卡也能通关；存档验证、注入边界、双语启动、重置确认、存储不可用回退 |
| [文件生成与宿主入口](<../tests/create-cards.test.mjs>) | 16 | 真实 Session、working-directory、fs-sandbox / fs-local、sandboxPolicy、observation；工作目录变化与会话隔离；真实 root plugin 注册与 ToolRuntime 执行；同名、目录、链接、悬空链接、路径穿越、并发 create-only、取消；打包函数的独立 HTML 执行 |
| [MCP 传输与编辑检查](<../tests/mcp.test.mjs>) | 22 | 实际 MCP 客户端 stdio / Streamable HTTP；默认无编辑许可；目标、参数、schema、工具实例、Agent、时效、一尝试消费；reload、远端错误、项目切换；未知 schema 失败关闭；并发、跨编辑器与取消撤销 |
| [PTC 模式](<../tests/ptc.test.mjs>) | 5 | 实际 PtcExecutor、run_code 调度与宿主入口；同一程序 prepare→edit；程序结束撤销；审批、附加 guard、Agent 作用域；固定探测不绕过权限 |

文件测试使用真实宿主服务，不直接用 Node 写文件来冒充工具成功。MCP fixture 只维护内存中的路径和计数，不读写这些示例工程。PTC 解释器和场景响应采用确定性内存适配器，**没有调用 LLM，也没有声称运行了真实编辑器或真实编辑器脚本**；PTC 本身的调度/取消/权限路径来自实际宿主。

## 2. 真实 DSH 浏览器验收

先 `npm pack --ignore-scripts`，再通过真实 `dsh plugin --profile game-workshop-test add /absolute/path/to/package.tgz` 安装；用同一 profile 启动真实 Web 服务。[浏览器脚本](<../tests/ui.e2e.mjs>)连接该服务，而不是独立 HTML demo shell。

**18 项检查通过：**

1. 实际插件管理页显示中文名称、版本与可加载的自定义图标，**4 个组件中 1 运行、3 关闭**；三个 MCP 预设 ID 均真实存在。
2. 真实侧栏「游戏工坊」能打开主面板。
3. 编辑中文生成指令后复制，剪贴板与编辑内容逐字一致。
4. 父页面下载一个全新 HTML。
5. 实际点击抽卡，卡数 +1、灵露 -12、抽取计数 +1。
6. 实际点击开局三合一，卡数 -2，青岚鹿升为 2 星。
7. 装备赤金牙，UI 显示烬尾狐攻击增加到 42。
8. 自动战斗随时间推进，战报实际产生伤害事件。
9. 第一关胜利并解锁第二关。
10. 第二关胜利并解锁第三关。
11. 第三关胜利，进度达到 3/3；全部通过实际 UI 操作，没有直接改存档通关。
12. 游戏内下载 HTML 嵌入当前通关进度。
13. 刷新真实 DSH 页面、重新打开游戏，恢复完全相同的存档。
14. 宽度 390px：关闭宿主响应式侧栏后，父页面与 iframe 无横向溢出。
15. 浏览器设为 offline，以 `file://` 打开下载游戏，抽卡后刷新可恢复，无 HTTP 游戏资源请求。
16. 新浏览器上下文打开携带存档的文件，恢复通关进度；取消重置不改变状态，明确确认才重置。
17. 新英文/暗色上下文显示英文宿主页和游戏内容。
18. 所有测试页面均无未捕获浏览器错误。

自动化只会在自己的浏览器上下文中接受 DSH 预览提示、关闭可选的「开始使用」账号弹窗；试玩不需要账号或模型密钥。截图与结果不含这些测试服务的认证 token。

![真实 DSH 试玩截图](<images/dsh-workshop.png>)

截图使用本项目构建产物安装后的真实 DSH 页面，包含宿主侧栏与卡牌 UI；不是重新画一个 DSH 外壳。源码仓库只保留精选的这一张，其余截图、测试下载和 JSON 报告保存在被忽略的测试产物目录。

## 3. 发布前独立安全复核

复核实际 DSH guard / wrapper 顺序、JSON schema 前提、文件服务和 PTC 实现，重现并修复以下问题后才发布：

- **MCP schema 子集不能静默降级**：先 `assertSupportedJsonSchema`，后验证参数。对 `anyOf`、`$ref`、`minimum`、`pattern` 的拒绝分别覆盖 prepare、guard 和只读 probe，不向远端错误派发。
- **Unity 全局项目列表不等于当前编辑目标**：默认 `unity-status` 仅用于 discovery；修改必须配置经审核、确实针对连接所选目标的 `unityProbe`。未配置时拒绝，不靠路径出现在列表中判断。
- **异步撤销必须防止旧操作重新授权**：每个 Agent 的确认代次、原始取消信号、编辑前重新探测与串行队列一起检查。并发失败 prepare、更新的 inspect、跨编辑器请求和已完成 probe 后的取消都有回归用例。
- **固定探测不能绕过宿主权限**：使用官方公开 ToolExecutionPipeline；确认仍受审批、额外 guard 和 Agent 可见性约束。PTC 只允许同一 run_code 中完成准备与编辑。
- 同名文件并发通过宿主 `createIfAbsent` 原子发布；不覆盖现有目录、文件或链接。剩余祖先目录符号链接竞争属于宿主文件系统威胁边界，不把插件宣称为任意本机攻击的隔离机制。
- HTML 配置与文本转义、受限数值、存档重建、SVG 颜色/ID 处理及编译后的函数源码可执行性均已检查。iframe 只载入可信样例，**不是任意用户 HTML 的安全沙箱**。

## 4. 编辑器：协议通过，真实联调未验证

| 编辑器 | 连接配置 | 协议验证 | 真实编辑器 |
| --- | --- | --- | --- |
| Unity CLI | stdio，指定 CLI 可执行文件、`--project-path`、`--cli-tools`，默认关闭 | 实际 DSH 客户端 + 本地测试服务通过 | **未验证** |
| UE 5.8 | 本机 Streamable HTTP，默认 `127.0.0.1:8000/mcp`，默认关闭 | 实际 DSH 客户端 + 系统分配 loopback 端口的测试服务通过 | **未验证** |
| Blender Lab 官方 MCP | stdio，可执行文件绝对路径、官方 add-on，默认关闭 | 实际 DSH 客户端 + 本地测试服务通过 | **未验证** |

本机检查的常见应用目录与 PATH 未发现这些编辑器；这不是对整台机器所有位置的穷举。本次没有在真实工程中执行渲染、导入、创建卡片或保存资产。README 中 Blender→Unity 跨工具流程是指导，不是成功联调报告。

Unity/UE 所选工程查询须由使用者对实际版本人工审核；未知 schema 会失败关闭。这些保守限制和官方安装来源见[接入指南](<editors.md>)。本机传输不代表依赖程序不联网；特别是 Unity CLI 的数据收集需按其官方设置单独管理。

## 5. 发布与复现原则

- 推送前再次核对登录账号 `a348579184`、仓库公开状态和远程历史；起始仓库为空，不强推、不覆盖已有提交。
- 提交源码、锁文件、文档、原始图形和预构建客户端；排除运行时检查副本、node_modules、认证信息、临时 tarball 与测试下载。
- `v0.1.0` Release 附实际安装 tarball 与 SHA-256，不把源码 ZIP 当成 npm 包。
- 公开发布后，从全新独立 profile 通过 `github:a348579184/dsh-game-workshop#v0.1.0` 再安装并验证；公开安装结果记录在 Release，避免把本地 tarball 安装成功当作公开 GitHub 验证。
- 最终用户命令见 [README 安装部分](<../README.md#安装>)。只验证过该 DSH 版本和 Chrome；不宣称其他 DSH 版本、所有浏览器或真实编辑器已经通过。
