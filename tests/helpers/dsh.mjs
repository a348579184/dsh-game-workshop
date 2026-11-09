import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { access } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createEditorPolicy } from '../../host/editor-policy.js';

const defaultRoot = fileURLToPath(new URL('../../../.inspection/dsh/', import.meta.url));
export const runtimeRoot = resolve(process.env.DSH_TEST_RUNTIME || defaultRoot);

/** Missing optional extracted runtime skips public-repo tests; broken installed modules fail. */
export async function loadDsh() {
  try { await access(resolve(runtimeRoot, 'node_modules/@deepseek-ai/dsh-tools/package.json')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { skip: `Optional DSH runtime absent at ${runtimeRoot}; set DSH_TEST_RUNTIME to an extracted DSH 0.2.2-rc.1 root (no dependency install required).` };
  }
  const require = createRequire(resolve(runtimeRoot, 'package.json'));
  const load = name => import(pathToFileURL(require.resolve(name)).href);
  const [cordis, tools, prompt, executor, mcp, scope, pipeline] = await Promise.all([
    load('@deepseek-ai/cordis'), load('@deepseek-ai/dsh-tools'), load('@deepseek-ai/dsh-system-prompt'),
    load('@deepseek-ai/dsh-tool-executor-native'), load('@deepseek-ai/dsh-mcp-client'), load('@deepseek-ai/dsh-scope'), load('@deepseek-ai/dsh-tools/pipeline'),
  ]);
  return { cordis, tools, prompt, executor, mcp, scope, pipeline };
}

/** Real Cordis services and MCP bridge; fake agents provide scope identities, not an LLM. */
export async function makeHarness(runtime, connection, config = {}) {
  const ctx = new runtime.cordis.Context();
  const fibers = [];
  const scopes = [];
  let clock = 1_000;
  const startWaiters = [];
  const policyStarted = predicate => new Promise(resolve => startWaiters.push({ predicate, resolve }));
  const mount = async (plugin, options) => { const fiber = ctx.plugin(plugin, options); fibers.push(fiber); await fiber.await(); return fiber; };
  async function close() {
    for (const scope of scopes.reverse()) await scope.dispose();
    // dispose() itself waits for asynchronous unload; await() would rethrow an old startup error.
    for (const fiber of fibers.reverse()) await fiber.dispose();
  }
  try {
    await mount(runtime.prompt.default, {});
    await mount(runtime.tools.default, {});
    await mount(runtime.executor);
    let policy;
    await mount({ name: 'workshop-policy-test', inject: ['tools'], apply(inner) {
      const probePipeline = new runtime.pipeline.ToolExecutionPipeline(inner);
      policy = createEditorPolicy(inner, config, () => clock, runtime.tools.validateJsonSchemaValue, runtime.tools.assertSupportedJsonSchema,
        input => runtime.pipeline.executeToolBatch(input, probePipeline, () => 1));
      inner.tools.guard(policy.guard);
      inner.on('tools/execute', policy.wrap);
      inner.tools.register({
        name: 'game_workshop_editors', description: 'Exercise actual workshop editor policy',
        parameters: { type: 'object', properties: { action: { type: 'string' }, editor: { type: 'string' }, expected_project: { type: 'string' }, next_tool: { type: 'string' }, next_arguments: { type: 'object', additionalProperties: true } }, additionalProperties: false },
        output: { schema: {}, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
        execute(args, exec) {
          // Calling the async policy runs its synchronous invalidation before returning.
          const outcome = policy.execute(args, exec);
          for (const waiter of [...startWaiters]) if (waiter.predicate(args, exec)) {
            startWaiters.splice(startWaiters.indexOf(waiter), 1);
            waiter.resolve({ args, exec });
          }
          return outcome;
        },
      });
    } });
    const connect = options => mount(runtime.mcp, { ...options, failOnStartupError: true, toolCallTimeoutMs: 2_000, reconnect: { enabled: false } });
    const bridge = await connect(connection);
    function agent() {
      const value = { session: {} };
      const scoped = runtime.scope.createScope(ctx, value);
      value.ctx = scoped.ctx;
      scopes.push(scoped);
      return value;
    }
    async function call(name, args = {}, owner, signal = new AbortController().signal) {
      const batch = await ctx.tools.execute({ calls: [{ id: randomUUID(), name, arguments: JSON.stringify(args) }], agent: owner, signal, maxParallelToolCalls: 1 });
      return batch.results[0].result;
    }
    return { ctx, bridge, policy, agent, call, close, connect, policyStarted, advance: ms => { clock += ms; } };
  } catch (error) { await close(); throw error; }
}
