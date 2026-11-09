import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadDsh, runtimeRoot } from './helpers/dsh.mjs';

const runtime = await loadDsh();
let ptc, workshop;
if (!runtime.skip) {
  const require = createRequire(join(runtimeRoot, 'package.json'));
  ptc = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-tool-executor-ptc')).href);
  // Load the shipped entrypoint unchanged using the extracted host's resolver.
  // The hook is temporary; it neither rewrites source nor installs dependencies.
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(specifier.startsWith('@deepseek-ai/') ? require.resolve(specifier) : specifier, context);
    },
  });
  try { workshop = await import('../index.js'); }
  finally { hooks.deregister(); }
}

const PROBE = 'mcp__gw_blender__get_blendfile_summary_path_info';
const MUTATION = 'mcp__gw_blender__ptc_fixture_mutate';
const PROJECT = '/synthetic-workshop-ptc/scene.blend';
const PREPARE = {
  action: 'prepare', editor: 'blender', expected_project: PROJECT,
  next_tool: MUTATION, next_arguments: {},
};
const options = { skip: runtime.skip || false, timeout: 15_000 };

function success(result) {
  assert.notEqual(result.isError, true, JSON.stringify(result));
  return result.value.result; // run_code's canonical output wraps the program value.
}
function denied(result, pattern) {
  assert.equal(result.isError, true, JSON.stringify(result));
  if (pattern) assert.match(JSON.stringify(result), pattern);
}

/**
 * Actual Cordis, shipped workshop plugin, PtcExecutor/run_code, nested scheduler,
 * MCP definition adapter, approval seam and agent scopes. Only the language
 * interpreter, editor, working-directory lookup and Session log are in-memory
 * adapters. No arbitrary program evaluation, filesystem writes, profiles,
 * transport connections, servers or real editors are involved.
 */
async function fixture(t) {
  const ctx = new runtime.cordis.Context(), fibers = [], scopes = [];
  const state = { probes: 0, mutations: 0, ask: false, allow: true, guardDenied: false, approvals: [] };
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    const failures = [];
    for (const scope of scopes.reverse()) {
      try { await scope.dispose(); } catch (error) { failures.push(error); }
    }
    for (const fiber of fibers.reverse()) {
      try { await fiber.dispose(); } catch (error) { failures.push(error); }
    }
    if (failures.length) throw new AggregateError(failures, 'PTC test fixture cleanup failed');
  }
  t.after(close);
  const mount = async (plugin, config = {}) => {
    const fiber = ctx.plugin(plugin, config);
    fibers.push(fiber);
    await fiber.await();
    return fiber;
  };

  // Satisfy the shipped plugin's declared dependencies without providing any
  // filesystem operation. This suite never invokes the HTML creation tool.
  class NoIOFileSystem extends runtime.cordis.Service {
    constructor(inner) { super(inner, 'fs'); }
  }
  class NoIOWorkingDirectory extends runtime.cordis.Service {
    constructor(inner) { super(inner, 'workingDirectory'); }
    async ensure() { return process.cwd(); }
  }
  class InMemoryApproval extends runtime.cordis.Service {
    constructor(inner) { super(inner, 'approval'); }
    async request(input) {
      state.approvals.push({ agent: input.agent, toolName: input.toolName });
      // Actual rc.1 ApprovalOutcome is a string union, not { kind: ... }.
      return state.allow ? 'allowed-once' : 'rejected';
    }
  }
  class InMemoryPtcRuntime extends runtime.cordis.Service {
    language = 'typescript';
    programFormat = 'function-body';
    constructor(inner) { super(inner, 'ptcRuntime'); }
    resolve(input) { return input; }
    release() {}
    async run(input) {
      const tools = input.bindings.find(binding => binding.global === 'tools').functions;
      try {
        let value;
        // Fixed program markers exercise the real executor's bindings and
        // lifecycle without running a language worker or accepting arbitrary code.
        switch (input.program) {
          case 'inspect':
            value = await tools.game_workshop_editors({ action: 'inspect', editor: 'blender' });
            break;
          case 'prepare-only':
            value = await tools.game_workshop_editors(PREPARE);
            break;
          case 'edit-only':
            value = await tools[MUTATION]({});
            break;
          case 'prepare-and-edit': {
            const prepared = await tools.game_workshop_editors(PREPARE);
            const edited = await tools[MUTATION]({});
            value = { prepared: prepared.prepared, mutations: edited.structuredContent.mutations };
            break;
          }
          default: throw new Error('Unknown fixed PTC test program');
        }
        return { logs: [], value };
      } catch (error) {
        return { logs: [], error: { kind: 'program', message: error.message } };
      }
    }
  }

  await mount(runtime.prompt.default);
  await mount(runtime.tools.default);
  await mount(NoIOFileSystem);
  await mount(NoIOWorkingDirectory);
  await mount(InMemoryPtcRuntime);
  await mount(InMemoryApproval);
  await mount(ptc);
  await mount(workshop, workshop.Config({}));
  await mount({
    name: 'workshop-ptc-in-memory-fixture', inject: ['tools'],
    apply(inner) {
      const add = (name, body) => inner.tools.register(runtime.mcp.createMcpToolDefinition(inner, {
        name, rawName: name, description: 'Synthetic in-memory editor; no transport',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        call: async () => {
          const value = body();
          return { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value };
        },
      }));
      add(PROBE, () => { state.probes++; return { status: 'ok', is_saved: true, filepath: PROJECT }; });
      add(MUTATION, () => ({ mutations: ++state.mutations }));
      inner.on('tools/pre-execute', (exec, next) => state.ask && exec.name === PROBE
        ? Promise.resolve({ kind: 'ask', reason: 'Synthetic in-memory approval gate' }) : next());
      inner.tools.guard(exec => state.guardDenied && exec.name === PROBE
        ? 'Synthetic monotonic guard denial' : undefined);
    },
  });

  function agent() {
    let seq = 0;
    const value = { session: {
      id: randomUUID(),
      append(type, data) { return { seq: ++seq, type, data }; },
    } };
    const scope = runtime.scope.createScope(ctx, value);
    value.ctx = scope.ctx;
    scopes.push(scope);
    return value;
  }
  const owner = agent();
  async function call(name, args, value = owner) {
    const batch = await ctx.tools.execute({
      agent: value, signal: new AbortController().signal, maxParallelToolCalls: 1,
      calls: [{ id: randomUUID(), name, arguments: JSON.stringify(args) }],
    });
    assert.equal(batch.results.length, 1);
    return batch.results[0].result;
  }
  const run = (code, value = owner) => call('run_code', {
    code, description: 'Verify isolated editor safety without filesystem changes',
  }, value);
  return { ctx, state, owner, agent, call, run };
}

test('actual PTC and shipped host plugin support inspect and same-program prepare/edit', options, async t => {
  const h = await fixture(t);
  denied(await h.call(PROBE, {}), /only.*run_code/);
  assert.equal(h.state.probes, 0, 'PTC rejects a bare top-level MCP call');
  assert.deepEqual(success(await h.run('inspect')).projects, [PROJECT]);
  assert.equal(h.state.probes, 1, 'host-owned probe uses the guarded pipeline, not the PTC-only entry');
  assert.deepEqual(success(await h.run('prepare-and-edit')), { prepared: true, mutations: 1 });
  assert.equal(h.state.probes, 3, 'prepare and actual edit each perform their own identity query');
  assert.equal(h.state.mutations, 1);
});

test('normal PTC run_code settlement revokes preparation before a separate program', options, async t => {
  const h = await fixture(t);
  assert.equal(success(await h.run('prepare-only')).prepared, true);
  denied(await h.run('edit-only'), /Prepare|prepare/);
  assert.equal(h.state.mutations, 0);
  assert.equal(h.state.probes, 1, 'revoked proof is denied before another remote query');
  assert.deepEqual(success(await h.run('prepare-and-edit')), { prepared: true, mutations: 1 });
});

test('PTC internal editor probes preserve calling-agent approval and rejection', options, async t => {
  const h = await fixture(t);
  h.state.ask = true;
  h.state.allow = false;
  denied(await h.run('inspect'), /user rejected/);
  assert.equal(h.state.probes, 0);
  assert.equal(h.state.approvals.length, 1);
  assert.equal(h.state.approvals[0].agent, h.owner);
  assert.equal(h.state.approvals[0].toolName, PROBE);
  h.state.allow = true;
  assert.deepEqual(success(await h.run('inspect')).projects, [PROJECT]);
  assert.equal(h.state.probes, 1);
  assert.equal(h.state.approvals.length, 2);
  assert.equal(h.state.approvals[1].agent, h.owner);
});

test('PTC internal editor probes obey additional monotonic tool guards', options, async t => {
  const h = await fixture(t);
  h.state.guardDenied = true;
  denied(await h.run('inspect'), /Synthetic monotonic guard denial/);
  assert.equal(h.state.probes, 0);
  h.state.guardDenied = false;
  assert.deepEqual(success(await h.run('inspect')).projects, [PROJECT]);
  assert.equal(h.state.probes, 1);
});

test('PTC internal editor probe visibility remains isolated per Agent', options, async t => {
  const h = await fixture(t), other = h.agent();
  const unrestrict = h.owner.ctx.get('tools').restrict({ deny: [PROBE] });
  try {
    denied(await h.run('inspect'), /not discovered|未发现/);
    assert.equal(h.state.probes, 0);
    assert.deepEqual(success(await h.run('inspect', other)).projects, [PROJECT]);
    assert.equal(h.state.probes, 1, 'one Agent restriction must not hide another Agent’s probe');
  } finally { await unrestrict(); }
  assert.deepEqual(success(await h.run('inspect')).projects, [PROJECT]);
  assert.equal(h.state.probes, 2);
});
