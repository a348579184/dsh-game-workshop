import { createHash, randomUUID } from 'node:crypto';

export const EDITORS = Object.freeze({
  unity: { namespace: 'gw_unity', probe: 'unity-status' },
  unreal: { namespace: 'gw_unreal', probe: '' },
  blender: { namespace: 'gw_blender', probe: 'get_blendfile_summary_path_info' },
});
const PREFIX = 'mcp__';
const MAX_PROOF_AGE = 60_000;

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}
export function editorOf(name) {
  return Object.keys(EDITORS).find(editor => name.startsWith(`${PREFIX}${EDITORS[editor].namespace}__`));
}
// DSH 0.2.2-rc.1's documented v1 MCP naming contract, including lossy-name hashes.
function publicName(editor, raw) {
  const namespace = EDITORS[editor].namespace;
  const joined = `${PREFIX}${namespace}__${raw}`;
  const normalized = joined.replace(/[^A-Za-z0-9_-]/g, '_');
  if (normalized === joined && normalized.length <= 64) return normalized;
  const hash = createHash('sha256').update(`${namespace}\0${raw}`).digest('hex').slice(0, 12);
  return `${normalized.slice(0, 51)}_${hash}`;
}

/** No substring tests: compare entire absolute project/file identities. */
export function normalizedProject(value) {
  if (typeof value !== 'string' || !value.trim() || /[\x00-\x1f]/u.test(value)) return undefined;
  let path = value.replaceAll('\\', '/');
  if (!path.startsWith('/') && !/^[A-Za-z]:\//u.test(path)) return undefined;
  if (path.split('/').some(part => part === '..' || part === '.')) return undefined;
  path = path.replace(/\/+$/u, '') || '/';
  // Only normalize a Windows drive letter, not path case on case-sensitive filesystems.
  return path.replace(/^([A-Z]):/u, (_, drive) => `${drive.toLowerCase()}:`);
}

function responseObjects(value) {
  const objects = [];
  if (value?.structuredContent && typeof value.structuredContent === 'object') objects.push(value.structuredContent);
  for (const block of value?.content ?? []) {
    if (block?.type !== 'text' || typeof block.text !== 'string' || block.text.length > 1_000_000) continue;
    try { const parsed = JSON.parse(block.text); if (parsed && typeof parsed === 'object') objects.push(parsed); } catch { /* Not a structured identity response. */ }
  }
  return objects;
}
function pointer(object, path) {
  if (!path.startsWith('/')) return undefined;
  for (const part of path.slice(1).split('/')) {
    const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
    if (key === '__proto__' || key === 'prototype' || key === 'constructor' || !object || !Object.hasOwn(object, key)) return undefined;
    object = object[key];
  }
  return object;
}

/** Official, fixed identity fields only; arbitrary echoed text is never proof. */
export function projectIdentities(editor, value, identityProbe) {
  const identities = [];
  for (const object of responseObjects(value)) {
    if (editor === 'blender' && object.status === 'ok' && object.is_saved === true) {
      const path = normalizedProject(object.filepath);
      if (path) identities.push(path);
    }
    if (editor === 'unity' && !identityProbe && object.success === true && Array.isArray(object.data?.items)) {
      for (const item of object.data.items) {
        // Official CLI reports ready Unity Editor instances; a path alone is insufficient.
        if (item.state !== 'ready' && item.status !== 'ready' && item.ready !== true) continue;
        const path = normalizedProject(item.projectPath);
        if (path) identities.push(path);
      }
    }
    if ((editor === 'unreal' || editor === 'unity') && identityProbe?.identityPointer) {
      const path = normalizedProject(pointer(object, identityProbe.identityPointer));
      if (path) identities.push(path);
    }
  }
  return [...new Set(identities)];
}

/**
 * Safety gate over this bundle's namespaces only. It does not elevate DSH permissions.
 * A proof is scoped to one Agent, one live registration, one exact call, and 60 seconds.
 * Every mutation re-queries the scene immediately before dispatch, inside an editor lock.
 */
export function createEditorPolicy(ctx, config = {}, now = Date.now, validateSchema, assertSchema, executeProbe = input => ctx.tools.execute(input)) {
  if (typeof validateSchema !== 'function' || typeof assertSchema !== 'function') throw new Error('DSH JSON Schema assertion and validator are required for editor safety.');
  const proofs = new WeakMap();
  const generations = new WeakMap();
  const internal = new Map();
  const queues = new Map();

  function violationsFor(schema, value, label) {
    try {
      // The runtime validator only implements its asserted subset. Never ignore
      // raw MCP keywords such as anyOf/$ref/pattern/minimum silently.
      assertSchema(schema);
      return validateSchema(schema, value, label);
    } catch (error) { return [`不支持的 MCP 参数 schema / Unsupported MCP schema: ${error.message}`]; }
  }
  function probeFor(editor, allowDiscovery = false) {
    if (editor === 'blender') return { name: publicName(editor, EDITORS[editor].probe), args: {} };
    const configured = config[`${editor}Probe`];
    if (configured?.tool && configured.identityPointer && configured.auditedReadOnly === true) {
      return { name: publicName(editor, configured.tool), args: configured.arguments ?? {}, identityProbe: configured };
    }
    if (editor === 'unity' && allowDiscovery) return { name: publicName(editor, EDITORS.unity.probe), args: {}, discoveryOnly: true };
    throw new Error(`${editor} 尚未配置经审核、针对当前连接所选工程的只读身份查询。请设置 ${editor}Probe；Unity status 的项目列表不是当前目标证明，Unreal call_tool 也不能默认视为只读。 / Configure an audited selected-project identity probe first.`);
  }
  function safeRead(exec) {
    const editor = editorOf(exec.name);
    if (!editor) return false;
    if (editor === 'unity' && exec.name === publicName('unity', EDITORS.unity.probe) && canonicalJson(exec.arguments) === '{}') return true;
    if (editor === 'unreal' && ['list_toolsets', 'describe_toolset'].includes(exec.name.slice(`mcp__gw_unreal__`.length))) return true;
    try { const probe = probeFor(editor); return exec.name === probe.name && canonicalJson(exec.arguments) === canonicalJson(probe.args); }
    catch { return false; }
  }
  function isInternal(exec) {
    const request = internal.get(exec.callId);
    return request && request.agent === exec.agent && request.name === exec.name && request.arguments === canonicalJson(exec.arguments);
  }
  async function locked(editor, signal, callback) {
    const prior = queues.get(editor) ?? Promise.resolve();
    let release;
    const tail = new Promise(resolve => { release = resolve; });
    queues.set(editor, tail);
    try {
      // Waiting is bounded by the underlying MCP call timeout. No editor calls overlap.
      await prior;
      signal.throwIfAborted();
      return await callback();
    } finally {
      release();
      if (queues.get(editor) === tail) queues.delete(editor);
    }
  }
  async function query(editor, exec, allowDiscovery = false) {
    exec.signal.throwIfAborted();
    const probe = probeFor(editor, allowDiscovery);
    const definition = ctx.tools.get(probe.name, exec.agent);
    if (!definition) throw new Error(`当前会话未发现只读查询工具 ${probe.name}。检查预设、编辑器及连接状态。 / Read-only probe is not discovered.`);
    const violations = violationsFor(definition.parameters, probe.args, 'probe');
    if (violations.length) throw new Error(`只读查询参数与现场 schema 不符 / Invalid probe arguments: ${violations.join('; ')}`);
    const id = `gw-probe-${randomUUID()}`;
    internal.set(id, { agent: exec.agent, name: probe.name, arguments: canonicalJson(probe.args) });
    let outcome;
    try {
      const batch = await executeProbe({ agent: exec.agent, signal: exec.signal, maxParallelToolCalls: 1, calls: [{ id, name: probe.name, arguments: JSON.stringify(probe.args) }] });
      outcome = batch.results[0]?.result;
    } finally { internal.delete(id); }
    exec.signal.throwIfAborted();
    if (!outcome || outcome.isError) throw new Error(`只读工程确认失败 / Read-only project probe failed: ${outcome?.error?.message ?? 'no result'}`);
    if (ctx.tools.get(probe.name, exec.agent) !== definition) throw new Error('查询期间工具已重载，请重新确认 / Probe registration changed.');
    const projects = projectIdentities(editor, outcome.value, probe.identityProbe);
    if (projects.length === 0 || (!probe.discoveryOnly && projects.length !== 1)) throw new Error('只读响应没有唯一、可验证的已保存工程/场景绝对路径；拒绝编辑。 / No unambiguous verified project or saved scene identity.');
    return { probe: probe.name, definition, projects, discoveryOnly: probe.discoveryOnly === true };
  }
  function guard(exec) {
    const editor = editorOf(exec.name);
    if (!editor) return undefined;
    const live = ctx.tools.get(exec.name, exec.agent);
    if (!live) return '编辑器工具未注册 / Editor tool is not registered.';
    const violations = violationsFor(live.parameters, exec.arguments, 'arguments');
    if (violations.length) return `编辑器参数无效 / Invalid editor arguments: ${violations.join('; ')}`;
    if (safeRead(exec)) return undefined;
    if (!exec.agent) return '编辑器修改必须属于 DSH 会话 / Editor edits require a session.';
    const proof = proofs.get(exec.agent);
    if (!proof || proof.signal.aborted || generations.get(exec.agent) !== proof.generation || proof.editor !== editor || proof.name !== exec.name || proof.arguments !== canonicalJson(exec.arguments) || now() - proof.at > MAX_PROOF_AGE || ctx.tools.get(exec.name, exec.agent) !== proof.definition) {
      return '编辑前请调用 game_workshop_editors，action="prepare"，指定 editor、expected_project、next_tool 和 next_arguments。只读核对通过后仅允许这一次精确调用。 / Prepare and verify this exact edit first.';
    }
    return undefined;
  }
  async function wrap(exec, next) {
    const editor = editorOf(exec.name);
    if (!editor || isInternal(exec)) return next();
    return locked(editor, exec.signal, async () => {
      if (safeRead(exec)) return next();
      const denial = guard(exec);
      if (denial) throw new Error(denial);
      const proof = proofs.get(exec.agent);
      proofs.delete(exec.agent); // one attempt, even when a later policy or remote call fails
      const observed = await query(editor, exec);
      exec.signal.throwIfAborted();
      if (proof.signal.aborted || generations.get(exec.agent) !== proof.generation) throw new Error('确认已被取消或新的检查取代，请重新确认 / Preparation was cancelled or superseded.');
      if (!observed.projects.includes(proof.project)) throw new Error('当前工程/场景已变化，拒绝编辑；请重新确认 / Editor target changed since preparation.');
      if (ctx.tools.get(exec.name, exec.agent) !== proof.definition) throw new Error('编辑工具已重载，请重新确认 / Edit registration changed.');
      return next();
    });
  }
  async function execute(args, exec) {
    const definitions = ctx.tools.definitions(exec.agent);
    const list = Object.keys(EDITORS).map(editor => ({
      editor,
      namespace: EDITORS[editor].namespace,
      tools: definitions.filter(tool => editorOf(tool.name) === editor).map(tool => ({ name: tool.name, description: tool.description, parameters: tool.parameters })),
      note: '仅表示当前会话实际注册的工具；连接是否仍可调用需只读探测。 / Registered tools, not a connectivity guarantee.',
    }));
    if (!args.action || args.action === 'list') return { editors: list };
    if (!exec.agent) throw new Error('请在 DSH 会话中确认编辑器 / A session is required.');
    // Supersede pending work before awaiting a per-editor queue, including across
    // editors. An older asynchronous completion must never re-arm permission.
    const generation = Symbol('workshop-confirmation');
    generations.set(exec.agent, generation);
    proofs.delete(exec.agent);
    exec.signal.throwIfAborted();
    if (!Object.hasOwn(EDITORS, args.editor ?? '')) throw new Error('editor 必须为 unity、unreal 或 blender。');
    const editor = args.editor;
    return locked(editor, exec.signal, async () => {
      const observed = await query(editor, exec, args.action === 'inspect');
      exec.signal.throwIfAborted();
      if (generations.get(exec.agent) !== generation) throw new Error('此确认已被更新的检查取代 / Confirmation superseded by a newer check.');
      if (args.action === 'inspect') return { editor, probe: observed.probe, projects: observed.projects, prepared: false, identity_kind: observed.discoveryOnly ? 'ready-project-list-not-selected' : 'selected-project-or-scene' };
      const project = normalizedProject(args.expected_project);
      if (!project || !observed.projects.includes(project)) throw new Error(`目标不匹配，拒绝编辑。实际工程 / Observed projects: ${JSON.stringify(observed.projects)}`);
      if (editorOf(args.next_tool ?? '') !== editor) throw new Error('next_tool 必须是该编辑器当前发现的完整工具名称。');
      const definition = ctx.tools.get(args.next_tool, exec.agent);
      if (!definition) throw new Error('未发现 next_tool / Planned tool is not registered.');
      const nextArgs = args.next_arguments ?? {};
      if (nextArgs === null || typeof nextArgs !== 'object' || Array.isArray(nextArgs)) throw new Error('next_arguments 必须为 JSON 对象。');
      const violations = violationsFor(definition.parameters, nextArgs, 'next_arguments');
      if (violations.length) throw new Error(`编辑器参数无效 / Invalid editor arguments: ${violations.join('; ')}`);
      exec.signal.throwIfAborted();
      if (generations.get(exec.agent) !== generation) throw new Error('此确认已被更新的检查取代 / Confirmation superseded.');
      proofs.set(exec.agent, { editor, project, name: args.next_tool, arguments: canonicalJson(nextArgs), definition, at: now(), generation, signal: exec.signal });
      return { editor, probe: observed.probe, project, next_tool: args.next_tool, next_arguments: nextArgs, prepared: true, expires_in_seconds: MAX_PROOF_AGE / 1000, message: '只读核对通过；仅下一次相同工具与参数可尝试执行，调用前还会重新查询工程。DSH 权限策略仍生效。 / Exact next edit prepared; normal DSH permissions still apply.' };
    });
  }
  return { execute, guard, wrap };
}
