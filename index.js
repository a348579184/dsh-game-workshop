import z from '@deepseek-ai/schemastery';
import { defineTool, validateJsonSchemaValue, assertSupportedJsonSchema } from '@deepseek-ai/dsh-tools';
import { ToolExecutionPipeline, executeToolBatch } from '@deepseek-ai/dsh-tools/pipeline';
import { createCards } from './host/create-cards.js';
import { createEditorPolicy } from './host/editor-policy.js';

export const name = 'game-workshop';
export const inject = ['tools', 'fs', 'workingDirectory'];
export const Config = z.object({
  unityProbe: z.object({
    tool: z.string().default('').description('经审核的 Unity 当前连接所选工程只读查询原始工具名。unity-status 是全部就绪项目列表，不能作为此查询。'),
    arguments: z.dict(z.any()).default({}).description('固定只读参数；须查询当前连接选择的工程，而不是回显传入的路径。'),
    identityPointer: z.string().default('').description('JSON 响应内指向所选工程绝对路径的 JSON Pointer，例如 /project/path。'),
    auditedReadOnly: z.boolean().default(false).description('人工审核该查询确为只读且返回所选目标身份后开启。'),
  }).description('未配置时 Unity 仅允许发现/只读列举项目，拒绝编辑。具体查询随本机 Pipeline 版本变化。'),
  unrealProbe: z.object({
    tool: z.string().default('').description('经人工审核的 UE 只读工具原始名称；Tool Search 模式可为 call_tool，但必须固定其参数。留空拒绝编辑。'),
    arguments: z.dict(z.any()).default({}).description('固定的只读参数；不得包含执行任意代码的请求。'),
    identityPointer: z.string().default('').description('在 JSON 响应对象内指向工程绝对路径的 JSON Pointer，例如 /project/path。不能使用普通场景名称。'),
    auditedReadOnly: z.boolean().default(false).description('仅在人工审查该工具和固定参数确为只读后开启。不是编辑权限授权。'),
  }).description('UE 5.8 工具随已启用 Toolsets 变化，必须先审核实际工程查询。'),
});

export function apply(ctx, config) {
  // Host-owned, fixed read-only probes use the public guarded pipeline rather
  // than a model-facing executor entry (PTC only accepts run_code there).
  // This retains schema policy, approval, guards, cancellation and result events.
  const probePipeline = new ToolExecutionPipeline(ctx);
  const editorPolicy = createEditorPolicy(ctx, config, Date.now, validateJsonSchemaValue, assertSupportedJsonSchema,
    input => executeToolBatch(input, probePipeline, () => 1));
  ctx.effect(() => ctx.tools.guard(editorPolicy.guard), 'game-workshop editor identity guard');
  ctx.on('tools/execute', editorPolicy.wrap);
  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'game_workshop_create_cards',
    description: '在当前 DSH 会话的工作目录新建一个原创、单文件、可离线玩并保存进度的卡牌游戏 HTML。可指定标题、最多六种卡牌（按顺序覆盖六个原创灵兽模板）、种子和文件名。包含抽卡、三合一升星、装备和三关自动战斗。仅新建，不覆盖文件或链接；同名时请用户换名。Create a playable offline card game in the selected session workspace without overwriting files.',
    parameters: {
      title: { type: 'string', description: '游戏标题，最多 80 字；省略为雾岭灵契。' },
      cards: { type: 'array', description: '1–6 张卡种定义，按顺序自定义灵兽模板。未提供的卡种保留原样。', items: { type: 'object', additionalProperties: false, properties: {
        name: { type: 'string', required: true, description: '原创名称，最多 32 字。' },
        description: { type: 'string', description: '原创描述，最多 160 字。' },
        attack: { type: 'number', description: '基础攻击 12–45，超出会限制到范围内。' },
        health: { type: 'number', description: '基础生命 60–180，超出会限制到范围内。' },
        color: { type: 'string', description: '可选 #RRGGBB 卡面主色；无效值使用原色。' },
      } } },
      seed: { oneOf: [{ type: 'string' }, { type: 'number' }], description: '可重复的随机种子；同一配置、操作序列得到同一结果。' },
      filename: { type: 'string', description: '不含目录的 .html 文件名；默认 雾岭灵契.html。必须未被占用。' },
      language: { type: 'string', enum: ['zh', 'en'], description: '游戏界面语言，默认 zh。' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: {
        path: { type: 'string', required: true },
        bytes: { type: 'integer', required: true },
        message: { type: 'string', required: true },
      } },
      render: (_args, value) => [{ type: 'text', text: `${value.message}\n\n[打开游戏 HTML](<${value.path}>)\n路径 / Path: ${value.path}\n${value.bytes} bytes` }],
    },
    async execute(args, exec) {
      if (args.cards && (args.cards.length < 1 || args.cards.length > 6)) throw new Error('卡组须包含 1–6 种卡牌 / Supply 1–6 card types.');
      return createCards(ctx, args, exec);
    },
  })), 'game-workshop create tool');
  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'game_workshop_editors',
    description: '列出当前会话实际发现的 Unity、Unreal、Blender MCP 工具（并非只列预设）。action=list 不连接/执行编辑器；inspect 执行固定只读查询（未配置 Unity 专用查询时仅列就绪项目，不证明所选目标）；prepare 为下一次精确编辑核对指定工程/场景，须给 editor、expected_project、next_tool、next_arguments。Unity/Unreal 编辑须先在插件配置中审核 unityProbe/unrealProbe。每次编辑前都要 prepare；PTC 模式需在同一次 run_code 中顺序 await prepare 和编辑，程序结束即撤销确认；未知或歧义查询、不支持的 schema、未保存场景或不匹配路径会拒绝编辑。普通 DSH 权限仍生效。',
    parameters: {
      action: { type: 'string', enum: ['list', 'inspect', 'prepare'], description: '默认 list；inspect 查询工程；prepare 只读核对下一次编辑。' },
      editor: { type: 'string', enum: ['unity', 'unreal', 'blender'], description: 'inspect / prepare 必填。' },
      expected_project: { type: 'string', description: 'prepare 必填：用户指定的绝对工程路径；Blender 为已保存 .blend 文件绝对路径。' },
      next_tool: { type: 'string', description: 'prepare 必填：当前发现的完整 MCP 工具名。' },
      next_arguments: { type: 'object', additionalProperties: true, properties: {}, description: '下一次编辑的完整参数，必须逐项一致；默认 {}。' },
    },
    output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }] },
    execute: editorPolicy.execute,
  })), 'game-workshop editor discovery tool');
}
