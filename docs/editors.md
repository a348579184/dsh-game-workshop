# 官方编辑器 MCP 接入（0.1.0）

核验日期：2026-11-09。目标宿主：**DeepSeek Harness 0.2.2-rc.1**。本页只说明可选连接，不安装编辑器、依赖、扩展，不替用户修改 DSH profile、启动服务或打开工程。

## 1. 先区分「官方存在」「本机可用」「已联调」

| 编辑器 | 本次核验的官方方案 | 传输 | 状态与限制 |
| --- | --- | --- | --- |
| Unity | **Unity CLI 内置 `unity mcp`** + 项目内 Unity Pipeline | stdio | 官方仍支持；旧 `com.unity.ai.assistant` 内置 MCP 已弃用，并非所有 Unity MCP 都弃用。驱动 Editor 要 Unity 6.0+。 |
| Unreal | **UE 5.8 Unreal MCP**（内部标识 `ModelContextProtocol`） | 本地 Streamable HTTP | Experimental；默认 `http://127.0.0.1:8000/mcp`，默认无认证，不可暴露公网。 |
| Blender | **Blender Lab MCP Server** + 官方 MCP add-on | stdio | 官方站要求 Blender 5.1+；服务是单独进程，不是 Blender 自带 LLM 功能。 |

依据：[Unity 弃用范围与迁移](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli.md)、[Unity 官方 MCP 参数说明](https://github.com/Unity-Technologies/skills/blob/main/skills/unity-cli/references/integration-advanced.md)、[UE 5.8 Unreal MCP](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor?application_version=5.8)、[Blender Lab 安装说明](https://www.blender.org/lab/mcp-server/)。上述内容均通过 `web_fetch` 获取核验；网页随版本变化，不能代替本机版本与 schema 核对。

**本机实际检查**：只查看常见应用路径、应用目录一级名称和 `command -v`，没有启动任何编辑器或连接本地端口。

- 以下常见位置不存在：`/Applications/Unity Hub.app`、`/Applications/Unity`、`/Applications/Epic Games Launcher.app`、`/Users/Shared/Epic Games`、`/Applications/Blender.app`。
- `/Applications`、`~/Applications`、`/Users/Shared` 一级目录没有名称包含 Unity、Unreal、Epic、Blender 的候选项。
- 当前 shell 的 PATH 中未找到 `unity`、`Unity`、`UnityHub`、`UnrealEditor`、`blender`、`blender-mcp`。
- 结论只能是「**本次检查范围内未发现可用安装，未做真实编辑器联调**」；自定义路径、外置磁盘、其他用户安装不在检查范围，不应写成「本机绝对没有安装」。

## 2. 三个独立且默认关闭的 DSH 条目

[预设补丁](<../editors/presets.patch.yml>) 使用 rc.1 的 `- insert:` 格式，不是其他客户端的 `mcpServers` JSON。构建时它已经合并到[主 bundle 补丁](<../cordis.patch.yml>)；安装游戏工坊 bundle 就会添加三个**禁用**的配置条目，不会启动编辑器或 MCP 服务。**不要再手工导入预设补丁，否则会重复条目／命名空间。**

| 条目 ID | `serverName` | DSH 工具前缀 |
| --- | --- | --- |
| `game-workshop-unity` | `gw_unity` | `mcp__gw_unity__` |
| `game-workshop-unreal` | `gw_unreal` | `mcp__gw_unreal__` |
| `game-workshop-blender` | `gw_blender` | `mcp__gw_blender__` |

操作步骤：

1. 人工安装所需的**官方**方案，确认版本、来源、工程路径以及安全隔离。
2. 安装游戏工坊 bundle 后，在 **DSH 设置中的插件配置**找到上述条目，保持禁用，填写真实绝对路径：Unity 的 `command` 指向官方 CLI，`args` 中的 `--project-path` 和 `cwd` 指向指定工程；Blender 的 `command` 指向官方服务环境内的可执行文件。`/REPLACE/WITH/...` 是故意不能工作的占位符。用户无需修改已安装包内的文件。
3. 保存配置后，只启用需要的那个 MCP 条目。其他两个仍保持禁用。保持 `game-workshop` 主插件启用，才能提供下述工程确认 guard；单独拷贝 MCP 条目不附带保护。配置的保存／启用由用户显式操作，本工具不自动更改 profile。
4. 调用 `game_workshop_editors` 的 `list`、`inspect` 检查实际工具和工程；每次编辑前调用 `prepare`，用完整目标路径和精确工具参数取得一次性确认。**启用 MCP 不等于同意任意代码执行**。

配置使用 `@deepseek-ai/dsh-mcp-client`：`transport: stdio` 对应 `command`、`args`、可选 `cwd`；`transport: streamable-http` 对应 `url`。没有把自定义字段塞进 MCP config。`failOnStartupError: false` 允许缺少编辑器时宿主继续；`reconnect.enabled: false` 避免意外重复启动／重连，失败后由用户检查并重载。工具调用超时为 60 秒，不是连接／发现超时；长时间渲染超时**不证明编辑器已停止执行**，不要盲目重发。

DSH rc.1 会为 stdio 协议协商启动一个临时探测进程，之后再启动服务进程；因此启动命令必须可重复且不能夹带一次性修改动作。环境变量会清理含 KEY/PASSWORD/SECRET/TOKEN 的环境名和 `DSH_*`；如官方服务确需额外变量，必须由用户审查后显式配置 `env`，不要把凭据写进仓库。

## 3. Unity：使用新 CLI，不再接旧 relay

### 官方安装与前置条件

- 按 [Unity CLI 安装说明](https://docs.unity.com/en-us/unity-cli/use-unity-cli.md) 人工安装 standalone CLI。官方提供脚本与包管理器选项；**本项目不执行下载脚本，不使用 `curl | bash` 自动安装**。macOS 要求 14+；Windows 10 21H1+；Linux 需要文档列出的发行版与 glibc 2.34+。
- 记录 `unity --version`，用 `unity mcp --help` 核对本机参数。核验时[发布说明](https://docs.unity.com/en-us/unity-cli/release-notes.md) 最新条目是 `1.0.0-beta.17`（2026-11-05），不是稳定版承诺。
- 在**指定 Unity 项目**安装 `com.unity.pipeline`，官方流程为 `unity pipeline install`，重编译后 `unity pipeline list` 检查；这会修改项目及安装依赖，必须由用户明确执行。详见 [Unity Pipeline 安装](https://docs.unity.com/en-us/unity-cli/unity-pipeline/unity-pipeline-package.md)。
- 驱动运行中的 Editor 需要 Unity 6.0+；若同时使用旧 Assistant，官方迁移页要求 Assistant 2.13+ 避免冲突。CLI 不要求 Unity AI 订阅，但 Unity Editor 自身许可仍适用。

### 连接参数

```text
/absolute/path/to/unity mcp --project-path /absolute/path/to/UnityProject --cli-tools
```

这是 **Unity CLI** 可执行文件，不是 `Unity.app` 内的 `Unity` 编辑器二进制。`--project-path` 固定工程；`cwd` 同样设置成该工程，不依赖启动 DSH 的目录。不使用 `--runtime`，因为它会优先选择 Player 而非 Editor。多个实例可用官方支持的 `--pid` / `--port` / `--instance` 进一步固定，必须先从真实只读状态取得值，不能猜测。

`--cli-tools` 额外提供官方只读 `unity-status`、`unity-editors-list`、`unity-projects-list`、`unity-projects-info`、`unity-releases`、`unity-doctor`。本预设包含此参数，便于无 shell 的 MCP 客户端检查连接。`unity-status` 的标准 CLI JSON envelope 可以报告 `data.items[].projectPath`、状态与 PID，但这是**全部连接的 Editor 列表，不是 MCP 当前选定目标的身份**。即使目标在列表中，也不能因此允许向另一个绑定工程的连接发出编辑。本插件仅把它用于 discovery；Unity 编辑还必须配置经人工审核、返回**该连接实际所选工程**的 `unityProbe`（见第 6 节）。不猜测 `editor_status` 的返回字段，不把回显调用参数中的路径当成身份。来源：[官方状态查询语义](https://docs.unity.com/en-us/unity-cli/reference/editor-project-commands.md)。

Editor 命令的 MCP 名称以空格、点号改为 `_`，例如 `scene get_hierarchy` → `scene_get_hierarchy`，`editor status` → `editor_status`；老版本可能是不同平面名称。**按现场发现的 schema 调用，不硬编码不存在的工具或参数**。`script_eval`、`script_eval_file`、通用 `exec`、`job_start` 都不能列为无条件只读。没有 Editor 时出现的 `unity-cli-status` 也不等于已确认工程。

Unity 旧 Assistant 的 MCP relay 被弃用，但 CLI 的 `unity mcp` 明确仍受支持。不要把旧配置中的 relay 路径复制过来，不自动执行 `unity mcp configure` 改其他客户端配置。来源：[官方 CLI 集成参数与工具表](https://github.com/Unity-Technologies/skills/blob/main/skills/unity-cli/references/integration-advanced.md)、[弃用范围](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli.md)。

### Unity 的网络与隐私设置

本插件/卡牌游戏不含遥测，不代表启用后的编辑器依赖也不联网。Unity CLI beta 默认启用部分[遥测与使用分析](https://docs.unity.com/en-us/unity-cli/data-collection-privacy-controls/cli-telemetry-data.md)，stdio 只是客户端传输方式。预设依据[官方退出说明](https://docs.unity.com/en-us/unity-cli/data-collection-privacy-controls/turn-off-data-collection.md)设置 `UNITY_NO_CLI_INVOKED_TELEMETRY=1`、`UNITY_NO_CRASH_REPORT=1`、`UNITY_NO_UPDATE_CHECK=1`。这些环境变量**不替代**用户自己的持久化 analytics 设置；启用前请审阅官方说明，必要时由你人工执行 `unity analytics opt-out`，并检查编辑器其他联网行为。本插件不替你修改全局隐私偏好。

## 4. Unreal：UE 5.8 官方本地服务

按 [UE 5.8 官方步骤](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor?application_version=5.8)：

1. 在 **Edit > Plugins** 启用 **Unreal MCP** 和 **All Toolsets**，依赖 **Toolset Registry** 自动启用，按提示重启。也可仅选择需要的 toolsets，减少暴露面。
2. **Edit > Editor Preferences > General > Model Context Protocol** 设置端口和路径。`Auto Start Server` 默认关闭；可保持关闭，在控制台人工运行 `ModelContextProtocol.StartServer` 或 `ModelContextProtocol.StartServer 8000`。
3. DSH 使用 `transport: streamable-http` 和 `http://127.0.0.1:8000/mcp`。这是官方文档的默认地址，不是 stdio，也不是旧社区 TCP 桥。端口冲突时以 Editor Output Log 实际绑定地址为准，不扫描猜测端口。
4. 官方客户端配置生成器没有声明 DSH 目标；无需为了 DSH 运行 `GenerateClientConfig All` 写入其他客户端文件，直接使用本预设。

**重要版本行为**：UE 默认开启 Tool Search，`tools/list` 通常只有 `list_toolsets`、`describe_toolset`、`call_tool`。前两项只发现工具目录，不确认当前工程／场景；第三项是任意工具分发器，绝不能因为名字短或描述含「查询」就视为只读。必须进一步审查选定 toolset 的实际 schema 与实现，并为只读确认固定 toolset、工具与参数。当前官方文档未给出一个可跨版本保证的工程身份查询工具名，因此本项目不伪造 `get_project_info`；没有审核过的 probe 时应阻止编辑，并请操作者配置。

Unreal 将调用串行同步到游戏线程，官方明确要求客户端不要重叠调用。一个编辑器的确认与编辑应串行执行。此功能仍为 **Experimental**，API 和数据格式可能变化；服务默认仅本机、无认证，禁止转发到公网或把监听地址改为任意网卡。`serverInfo.name = unreal-mcp` 是服务自报信息，不构成身份认证。

## 5. Blender：只使用 Blender Lab 官方来源

### 安装与来源辨别

[官方安装页](https://www.blender.org/lab/mcp-server/)要求 **Blender 5.1 或更新版**，另行安装 add-on、MCP server 和客户端。核验时官网链接的 add-on 为 **v1.0.3**；源码 main 的 server 包与 MCPB manifest 仍写 **1.0.2**，不能擅自把两者版本号统一或声称已验证组合。

- 官方代码仓库唯一入口：[Blender Lab / blender_mcp](https://projects.blender.org/lab/blender_mcp)。官方扩展仓库为 `https://lab.blender.org/`；按官网拖入 Blender 安装，首次添加仓库、第二次安装 add-on，或下载 ZIP 后 Install from Disk。
- 在 add-on 首选项确认 host、port 和 start/stop 状态，使用本机隔离环境。MCP service 通过 TCP socket 联系 add-on，客户端与 service 之间才是 stdio，不能混为一个端口。
- 官方 [server README](https://projects.blender.org/lab/blender_mcp/raw/branch/main/mcp/README.md) 给出的源码安装来源是 `git+https://projects.blender.org/lab/blender_mcp.git#subdirectory=mcp`。用户可在自己的隔离 Python 环境里安装经审核固定 revision；本项目不运行 pip/uv，不安装任何依赖。
- 官方 [pyproject](https://projects.blender.org/lab/blender_mcp/raw/branch/main/mcp/pyproject.toml) 自己也使用 **`blender-mcp`** 包名／可执行名，入口为 `blmcp:main`，Python 需要 3.10+。**同名不等于同源**：不要使用裸 `pip install blender-mcp`、`uvx blender-mcp`、第三方 GitHub blender-mcp 替代。记录实际安装的官方 Git URL 与 revision，使用该环境中的绝对可执行路径。
- 官方也提供 `.mcpb`；未验证 DSH rc.1 能直接导入该格式，因此不声称直接支持。DSH 这里采用官方源码安装后的 stdio executable，不要求 `.mcpb` 支持。

### 连接参数

```text
/absolute/path/to/official-venv/bin/blender-mcp --transport stdio
```

官方 [启动源码](https://projects.blender.org/lab/blender_mcp/raw/branch/main/mcp/blmcp/__init__.py?ref=main)确认 `--transport stdio`，默认也是 stdio。不要在 DSH 配置里用 `blender --background` 冒充 MCP server，也不要未经核验使用项目路径参数；当前 Blender 会话由已启动的官方 add-on 连接决定。

经官方源码验证的只读确认工具为 **`get_blendfile_summary_path_info`**，固定参数 `{}`，不是 `_for_cli` 变体。其[注册源码](https://projects.blender.org/lab/blender_mcp/raw/branch/main/mcp/blmcp/tools/get_blendfile_summary_path_info.py?ref=main)标记 `readOnlyHint=True`；其[执行源码](https://projects.blender.org/lab/blender_mcp/raw/branch/main/mcp/blmcp/tools/get_blendfile_summary_path_info_toolcode.py)从 `bpy.data.filepath` 返回 `status`、`filepath`、`is_saved`、`is_dirty`、文件状态及备份信息。应要求 `status == "ok"`、非空 `filepath`，精确匹配用户指定的 `.blend` 文件；未保存的新场景不能假装具有已确认的文件身份。真实 MCP 返回可能封装在 `structuredContent` 或 JSON 文本块中，必须验证后再提取。

[官方工具表](https://projects.blender.org/lab/blender_mcp/raw/branch/main/readme_tools.rst)还列出 `get_objects_summary`、`get_blendfile_summary_datablocks` 等读操作。`execute_blender_code`、`execute_blender_code_for_cli` 是任意代码执行；渲染工具会写文件，`jump_*` 改变 UI 状态，不得凭 `get` 前缀批量授予许可。`*_for_cli` 会打开传入文件的后台 Blender，不足以证明当前交互编辑器的场景。

**安全边界**：Blender 官方明确警告，该服务会执行模型生成代码，**没有防止删除数据或向远端发送数据的保护**，建议虚拟机或无法访问敏感信息的系统。DSH guard 是流程确认，不是 Blender 沙箱，也不是任意 Python 的安全证明。

## 6. 使用 `game_workshop_editors`：发现、检查、逐次准备

游戏工坊已提供[编辑器工具与配置](<../index.js>)和[工程确认 guard](<../host/editor-policy.js>)。它只保护本 bundle 的三个 `gw_*` MCP 命名空间；**不是通用代码沙箱，也不保护另一个自行配置的 MCP 命名空间或 shell 命令**。主插件必须保持启用，普通 DSH 权限审批仍然生效。

### `list`：只发现，不执行

```json
{"action":"list"}
```

省略 `action` 也默认为 `list`。返回 `editors` 数组，每项含 `editor`、`namespace`、`tools`、`note`；`tools` 是当前会话实际可见的完整名称、描述与参数 schema。此操作只读取 DSH 注册表，不启动进程、不探端口、不调用编辑器。空数组表示没有注册工具，不能据此断言编辑器没安装；列出工具也不保证连接仍在线。

### `inspect`：运行固定只读查询

```json
{"action":"inspect","editor":"blender"}
```

`editor` 只能为 `unity`、`unreal`、`blender`。返回 `editor`、实际 `probe` 名称、`projects` 绝对路径数组、`identity_kind` 和 `prepared: false`。把观察到的路径展示给用户，与用户指定工程核对；**inspect 不授予任何编辑许可**。

- Unity 未配置已审核的 `unityProbe` 时，只查询 `mcp__gw_unity__unity-status({})`，要求 `success: true`，列出 ready 实例的 `data.items[].projectPath`，返回 `identity_kind: "ready-project-list-not-selected"`。这是发现结果，**不能 prepare，不能因某项目在列表里就编辑它**。配置后使用已审核的所选目标查询，返回 `selected-project-or-scene`；实际连接仍必须通过 `--project-path` 绑定。
- Blender 固定查询 `mcp__gw_blender__get_blendfile_summary_path_info`，参数 `{}`，要求 `status: "ok"`、`is_saved: true` 和非空绝对 `filepath`。未保存场景会拒绝编辑。
- Unreal 没有内置猜测的工程查询，默认不能 inspect／prepare；必须按下一小节配置已审核的 probe。`list_toolsets`、`describe_toolset` 只查目录，不算工程确认。

### `prepare`：为一次精确编辑准备

| 字段 | 要求 |
| --- | --- |
| `action` | `"prepare"` |
| `editor` | `"unity"`、`"unreal"` 或 `"blender"` |
| `expected_project` | 用户指定的完整绝对工程路径；Blender 为已保存 `.blend` 文件绝对路径 |
| `next_tool` | 从 `list` 返回值复制的完整 MCP 工具名称，必须属于所选编辑器 |
| `next_arguments` | 下一次调用的完整 JSON 参数对象，必须符合现场 schema；省略时为 `{}` |

执行顺序：先与用户确认目标与改动，再用上述字段调用 `prepare`；收到 `prepared: true` 后，调用 **同一 `next_tool`，传入逐项一致的 `next_arguments`**。不是把 `prepare` 当成实际渲染／导入操作，也不能改变参数后沿用确认。名称不明或 schema 不匹配时先检查，不猜工具名。

确认有效期为 **60 秒**，绑定当前 Agent／会话、编辑器、目标路径、当前工具 registration、工具名、完整参数和原确认的取消信号。一次尝试即消费；失败也不能重放。进入新一次 inspect／prepare 即撤销旧确认，包括仍在等待的并发确认；旧查询晚返回不能重新授予许可。工具重载、过期、取消、参数变化、目标不符或歧义身份都会拒绝执行。同一编辑器的调用串行；编辑真正发出前还会重新查询工程，检查确认代次、取消状态和目标未变。

**PTC 模式：prepare 与编辑必须在同一次 `run_code` 程序中顺序 `await`。** rc.1 在程序结束时会取消该次程序的信号，因此只 prepare 后结束、下一次 run_code 再编辑会被拒绝；这是安全限制，不是自动恢复的授权。插件自己的固定只读探测走官方受 guard／审批保护的 ToolExecutionPipeline，而不是绕过权限直接调用 tool body。

身份比较是绝对路径的严格比较，不是文本包含；它仅规范路径分隔符、末尾斜杠和 Windows 盘符大小写，不解析符号链接或证明服务器真实性。人工切换工程仍可能发生在最后一次查询与编辑之间，因此 Unity 应固定项目 selector，Blender／UE 应避免多会话误连。确认流程不代替用户授权或隔离运行环境。

本插件在 prepare、guard 和只读查询前先调用 DSH `assertSupportedJsonSchema`，再用 `validateJsonSchemaValue` 验证参数。**DSH rc.1 MCP bridge 本身不保证本地验证输入类型，其 validator 也只实现有限 schema 子集**。出现 `anyOf`、`$ref`、`minimum`、`pattern` 等当前不支持的关键字时，本版明确拒绝调用，不静默忽略约束；这可能限制某些真实编辑器工具，须等待宿主支持或使用经过审核且 schema 可验证的接口，不能仅删掉约束绕过保护。远端服务也应校验自己的输入。远端 `readOnlyHint` 不作为自动授权依据，rc.1 的 DSH tool definition 也不保留该注解。除固定只读 probe、Unity 状态发现与 UE 工具目录查询外，其他编辑器工具保守地要求 prepare，即使名称看起来像查询。

### Unity / Unreal 的人工审核配置

在 DSH 设置中编辑 **`game-workshop` 主插件**的 `unityProbe` 或 `unrealProbe`，不是 MCP client 条目的 config：

- `tool`：实际 MCP **原始**工具名，不带 `mcp__gw_*__` 前缀；插件遵循 rc.1 对特殊字符和长名称的规范化／哈希规则。
- `arguments`：经审核的固定只读参数对象；没有参数时为 `{}`。
- `identityPointer`：从响应 JSON 对象提取**当前连接所选目标**的完整工程绝对路径的 JSON Pointer，例如 `/project/path`；必须与实际响应一致，不接受普通场景名称、项目列表中的任意元素或回显输入路径。
- `auditedReadOnly`：默认 `false`；只有人工审核工具实现、选择目标的语义和固定参数后才设为 `true`。

默认两项都不配置，因此 **Unity 与 UE 的编辑都失败关闭**。Unity 默认仍可 inspect 就绪项目列表；不能把这个列表配置成所选目标 probe。应从本机实际 Pipeline 工具中审核一个针对连接所选 Editor 的只读查询，不凭 `editor_status` 名字猜返回字段。

UE Tool Search 模式可在人工审核后将 `tool` 设为 `call_tool`，但 `arguments` 必须精确固定实际只读查询的 toolset／工具与参数；**这不允许任意 `call_tool` 调用免确认，也不能将运行 Python／C++ 的通用执行器作为只读 probe**。本页不提供未经官方确认的具体工程工具名或伪造返回字段；以安装的 UE 5.8 toolset 为准。

无法审核出安全 probe、工具缺失或 Editor 不可达时，报告实际情况并保持禁用，不自动安装社区服务、不以任意脚本绕过确认。

## 7. 跨工具例子：Blender 透明装备图 → 指定 Unity 项目装备卡

这是用户授权后的操作方案，**本次未执行，未生成或导入真实资产**。以下每次非固定只读 probe 的工具调用，都先按第 6 节对精确工具和参数执行 `prepare`；当前保守策略下，一般对象查询也需要该步骤。

1. 向用户确认装备外观、源 `.blend` 绝对路径、输出 PNG 路径、分辨率、指定 Unity 工程绝对路径、目标卡片／场景和覆盖规则；用户未提供工程路径时先询问，不能选择最近使用工程。
2. 仅启用 Blender 与 Unity 两项；发现实际工具。Blender 先用固定 `get_blendfile_summary_path_info({})` 确认源文件，再读对象／场景摘要，显示当前场景和目标装备，确认后才修改材质、相机、灯光及构图。
3. Blender 输出单件装备的透明 PNG：在获准的渲染配置中选择 PNG、RGBA、透明背景（Film Transparent），使用独立受控输出目录，防止覆盖源场景或无关文件。渲染是写操作；如果需要任意 Python，必须按高风险写操作审核，不把「只是渲染」等同只读。
4. 检查渲染结果确实存在、PNG 具有 alpha、背景像素透明、装备没有被裁切，并记录分辨率／文件哈希。黑底截图不是透明 PNG 证明；失败不要进入导入阶段。
5. Unity 通过固定 `--project-path` 与已人工审核的 `unityProbe` 再确认**连接所选的指定工程**，随后按真实工具查看当前场景；若尚未配置专用 probe，停止并补齐审核，不把 `unity-status` 列表当作证明。向用户展示待导入文件和目标 Assets 子目录，只复制批准的 PNG；使用发现到的官方资产导入工具，按现有 UI 方案将 Texture Type 设为 Sprite（2D and UI），保留 alpha，设置合理过滤、像素密度和压缩。
6. 把 Sprite 赋给指定装备卡的图像组件，保持宽高比，再关联装备名称、数值、品质、边框等既有数据，不改其他卡片、不自动迁移 UI 框架。创建／修改 prefab、场景或数据资产前确认保存目标；不得覆盖未保存的用户工作。
7. 最后只读回查引用、导入设置、卡片层级和 Console；用实际 Editor／Game View 截图验收透明边缘、布局与文字。明确区分「PNG 已生成」「已导入」「卡片已绑定」「保存成功」四个结果，不能仅凭工具返回成功声称完成。

## 8. 无编辑器条件下的自动化测试

仓库包含 [MCP 集成测试](<../tests/mcp.test.mjs>)、[本地假编辑器](<../tests/fixtures/mcp-server.mjs>)及 [DSH 测试加载器](<../tests/helpers/dsh.mjs>)。从源码仓库运行：

```sh
# 若仓库相邻目录 ../.inspection/dsh 已有提取的 DSH runtime：
node --test tests/mcp.test.mjs

# 或指定自己的已提取 runtime 根目录（含 node_modules）：
DSH_TEST_RUNTIME=/absolute/path/to/extracted-dsh node --test tests/mcp.test.mjs
```

没有可选 runtime 时，测试清楚标记 SKIP，不下载依赖，不把跳过写成通过真实联调。测试使用已有 `@modelcontextprotocol/client@2.2.0`／`core@2.2.0`；提取环境没有 server SDK，fixture 只用 Node 内置 `readline` 与 `node:http`，无需另外安装包。

已执行的验证：

- 实际 rc.1 `applyEntryPatches` 与 MCP `Config` 校验三个默认禁用条目通过。
- 实际 Cordis Context、SystemPrompt、ToolRuntime、NativeToolExecutor、`dsh-mcp-client` 与游戏工坊 `createEditorPolicy` 集成，**22/22 MCP 测试通过**。测试使用轻量 Agent scope 身份，不调用 LLM 或真实 Editor。
- Unity／Blender／UE 三类假编辑器分别在 stdio、Streamable HTTP 上验证工具发现、只读 probe、目标不匹配、缺少 prepare、精确参数、Agent 隔离、一次性消费、并发竞争、过期、真实 bridge 重载、远端错误、已取消调用及 HTTP 侧工程切换。
- 错误类型／多余字段／缺少必填字段拒绝；同一 definition 的现场 schema 改变后重新校验；`anyOf`、`$ref`、`minimum`、`pattern` 在 prepare／guard／probe 三处均失败关闭。
- 默认 Unity 只发现项目、不能授权编辑；Unity／UE 的所选目标 probe 必须明确审核。
- 用真实 HTTP 请求的确定性等待屏障测试并发失败 prepare、后来的 inspect、跨编辑器撤销、编辑前查询期间的撤销；取消已完成 probe 或旧确认信号均不能留下可重放许可。
- 固定 probe 不依赖 model-facing executor 支持裸 MCP 调用，仍服从 DSH guard。无运行时时相关测试明确 SKIP，不能计为真实集成通过。

fixture 的 `server/discover` 返回 `-32601`，验证 SDK 对 legacy `initialize`（`2025-11-25`）的回退；stdio 兼容临时探测进程和正式进程。HTTP 仅监听 `127.0.0.1` 的系统分配端口，不使用真实 UE 8000。fixture 只维护内存中的工程路径与修改计数，不读写这些示例工程；测试结束关闭子进程、作用域、MCP 连接与 HTTP 服务，不更改当前 DSH profile。

两个传输上的假编辑器组合是协议测试矩阵，不表示官方编辑器支持表外传输。**测试通过只证明本地协议适配与确认流程，不证明 Unity／Unreal／Blender 真实安装、渲染、导入或资产保存已验收。**
