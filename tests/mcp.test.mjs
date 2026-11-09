import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadDsh, makeHarness } from './helpers/dsh.mjs';
import { startHttpFixture } from './fixtures/mcp-server.mjs';

const runtime = await loadDsh();
const fixturePath = fileURLToPath(new URL('./fixtures/mcp-server.mjs', import.meta.url));
const editors = {
  unity: { project: '/tmp/workshop-unity', probe: 'audited_project' },
  blender: { project: '/tmp/equipment.blend', probe: 'get_blendfile_summary_path_info' },
  unreal: { project: '/tmp/workshop-ue', probe: 'audited_project' },
};
const unrealProbe = { tool: 'audited_project', arguments: {}, identityPointer: '/project', auditedReadOnly: true };
const unityProbe = { ...unrealProbe };
const trustedProbes = { unityProbe, unrealProbe };
function success(result) { assert.notEqual(result.isError, true, JSON.stringify(result)); return result.value; }
function denied(result, pattern) { assert.equal(result.isError, true, JSON.stringify(result)); if (pattern) assert.match(JSON.stringify(result), pattern); }

for (const transport of ['stdio', 'streamable-http']) {
  test(`actual DSH MCP ${transport}: discovery and editor guard`, { skip: runtime.skip || false, timeout: 30_000 }, async t => {
    for (const [editor, target] of Object.entries(editors)) {
      await t.test(editor, async () => {
        const http = transport === 'streamable-http' ? await startHttpFixture(editor) : undefined;
        let harness;
        try {
          const config = transport === 'stdio' ? { transport, command: process.execPath, args: [fixturePath, editor] } : { transport, url: http.url };
          harness = await makeHarness(runtime, { ...config, serverName: `gw_${editor}` }, trustedProbes);
          const a = harness.agent();
          const b = harness.agent();
          const probe = `mcp__gw_${editor}__${target.probe}`;
          const mutation = `mcp__gw_${editor}__fake_mutate`;
          const args = { label: 'exact planned edit' };
          const prepare = (overrides = {}, owner = a) => harness.call('game_workshop_editors', { action: 'prepare', editor, expected_project: target.project, next_tool: mutation, next_arguments: args, ...overrides }, owner);

          // Real bridge registrations and real workshop discovery, not fabricated registry rows.
          const names = harness.ctx.tools.schemas(a).map(tool => tool.name);
          assert(names.includes(probe)); assert(names.includes(mutation));
          const listing = success(await harness.call('game_workshop_editors', { action: 'list' }, a));
          assert.deepEqual(listing.editors.find(row => row.editor === editor).tools.map(tool => tool.name).sort(), [probe, mutation, ...(editor === 'unity' ? ['mcp__gw_unity__unity-status'] : [])].sort());
          for (const row of listing.editors.filter(row => row.editor !== editor)) assert.equal(row.tools.length, 0);
          if (http) { assert.equal(http.state.mutations, 0); assert.equal(http.state.probes, 0); }
          success(await harness.call(probe, {}, a));
          denied(await harness.call(mutation, args, a), /Prepare|prepare/);
          denied(await harness.call(mutation, args), /session|会话/);
          assert.equal(harness.ctx.tools.get(`${mutation}_unknown`, a), undefined);
          denied(await harness.call(`${mutation}_unknown`, args, a));

          denied(await prepare({ expected_project: `${target.project}-not-the-target` }), /目标不匹配|Observed/);
          denied(await harness.call(mutation, args, a));
          assert.equal(success(await prepare()).prepared, true);
          denied(await harness.call(mutation, { label: 'different edit' }, a));
          denied(await harness.call(mutation, args, b));
          assert.equal(success(await harness.call(mutation, args, a)).structuredContent.mutations, 1);
          denied(await harness.call(mutation, args, a), /Prepare|prepare/); // one-shot proof

          // A failed new confirmation revokes the previously prepared exact call.
          success(await prepare());
          denied(await prepare({ expected_project: '/tmp/incorrect-project' }));
          denied(await harness.call(mutation, args, a));

          success(await prepare());
          harness.advance(60_001);
          denied(await harness.call(mutation, args, a));

          // A live schema change must fail closed even if definition identity is unchanged.
          success(await prepare());
          const liveDefinition = harness.ctx.tools.get(mutation, a);
          const originalRequired = liveDefinition.parameters.required;
          try {
            liveDefinition.parameters.required = [...originalRequired, 'new_required_field'];
            denied(await harness.call(mutation, args, a));
          } finally { liveDefinition.parameters.required = originalRequired; }

          // Definition identity changes even if transport re-advertises the exact same name.
          success(await prepare());
          const previous = harness.ctx.tools.get(mutation, a);
          await harness.bridge.restart();
          assert.notEqual(harness.ctx.tools.get(mutation, a), previous);
          denied(await harness.call(mutation, args, a));
          success(await prepare());
          const resumed = success(await harness.call(mutation, args, a));
          assert.equal(resumed.structuredContent.label, args.label);

          // Two simultaneous tool batches cannot consume one proof twice.
          success(await prepare());
          const raced = await Promise.all([harness.call(mutation, args, a), harness.call(mutation, args, a)]);
          assert.equal(raced.filter(result => !result.isError).length, 1);
          assert.equal(raced.filter(result => result.isError).length, 1);

          const failing = { label: 'refused by remote fixture', fail: true };
          success(await prepare({ next_arguments: failing }));
          denied(await harness.call(mutation, failing, a), /Synthetic editor refused/);
          denied(await harness.call(mutation, failing, a), /Prepare|prepare/);

          // Workshop validates schema locally because rc.1 MCP bridge does not do so.
          const invalidCount = http?.state.mutations;
          denied(await prepare({ next_arguments: { label: 123 } }));
          denied(await harness.call(mutation, { label: 123 }, a));
          denied(await prepare({ next_arguments: { label: 'extra field', injected: true } }));
          denied(await prepare({ next_arguments: {} }));
          if (http) assert.equal(http.state.mutations, invalidCount);

          const controller = new AbortController(); controller.abort();
          denied(await harness.call(probe, {}, a, controller.signal));

          if (http) {
            // Alter synthetic live identity after prepare: dispatch must re-read and refuse.
            success(await prepare());
            const count = http.state.mutations;
            http.state.project = '/tmp/switched-editor-project';
            denied(await harness.call(mutation, args, a), /changed|变化/);
            assert.equal(http.state.mutations, count);
            http.state.project = target.project;
            assert(http.state.probes >= http.state.mutations * 2);
          }
        } finally {
          if (harness) await harness.close();
          if (http) await http.close();
        }
      });
    }
  });
}

test('actual DSH refuses malformed audited probe arguments before remote dispatch', { skip: runtime.skip || false, timeout: 10_000 }, async () => {
  const fixture = await startHttpFixture('unreal');
  let harness;
  try {
    harness = await makeHarness(runtime, { serverName: 'gw_unreal', transport: 'streamable-http', url: fixture.url }, { unrealProbe: { ...unrealProbe, arguments: { forbidden: 'schema mismatch' } } });
    denied(await harness.call('game_workshop_editors', { action: 'inspect', editor: 'unreal' }, harness.agent()), /schema|probe arguments/);
    assert.equal(fixture.state.calls.length, 0);
    assert.equal(fixture.state.mutations, 0);
  } finally { if (harness) await harness.close(); await fixture.close(); }
});

test('Unity discovery status cannot prepare a selected-project edit', { skip: runtime.skip || false, timeout: 10_000 }, async () => {
  const fixture = await startHttpFixture('unity');
  let harness;
  try {
    harness = await makeHarness(runtime, { serverName: 'gw_unity', transport: 'streamable-http', url: fixture.url });
    const agent = harness.agent();
    const observed = success(await harness.call('game_workshop_editors', { action: 'inspect', editor: 'unity' }, agent));
    assert.equal(observed.identity_kind, 'ready-project-list-not-selected');
    assert.equal(observed.prepared, false);
    assert.deepEqual(observed.projects, ['/tmp/workshop-unity']);
    denied(await harness.call('game_workshop_editors', { action: 'prepare', editor: 'unity', expected_project: '/tmp/workshop-unity', next_tool: 'mcp__gw_unity__fake_mutate', next_arguments: { label: 'must not run' } }, agent), /audited|审核/);
    denied(await harness.call('mcp__gw_unity__fake_mutate', { label: 'must not run' }, agent));
    assert.equal(fixture.state.mutations, 0);
  } finally { if (harness) await harness.close(); await fixture.close(); }
});

test('unsupported raw MCP schemas fail closed at prepare, guard, and probe', { skip: runtime.skip || false, timeout: 10_000 }, async t => {
  for (const [keyword, field] of Object.entries({ anyOf: { anyOf: [{ type: 'string' }] }, $ref: { $ref: '#/$defs/label' }, minimum: { type: 'number', minimum: 1 }, pattern: { type: 'string', pattern: '^safe$' } })) {
    await t.test(keyword, async () => {
      const fixture = await startHttpFixture('blender');
      const remoteTool = fixture.tools.find(tool => tool.name === 'fake_mutate');
      const original = structuredClone(remoteTool.inputSchema);
      remoteTool.inputSchema = { ...original, properties: { ...original.properties, label: field } };
      let harness;
      try {
        // Discover the unsupported raw inputSchema over real HTTP, not just a stub registry.
        harness = await makeHarness(runtime, { serverName: 'gw_blender', transport: 'streamable-http', url: fixture.url });
        const agent = harness.agent();
        const name = 'mcp__gw_blender__fake_mutate';
        const definition = harness.ctx.tools.get(name, agent);
        const prepare = next_arguments => harness.call('game_workshop_editors', { action: 'prepare', editor: 'blender', expected_project: '/tmp/equipment.blend', next_tool: name, next_arguments }, agent);
        definition.parameters = { ...original, properties: { ...original.properties, label: field } };
        denied(await prepare({ label: 123 }), /Unsupported|不支持/);
        assert.equal(fixture.state.calls.filter(call => call.name === 'fake_mutate').length, 0);
        definition.parameters = original;
        success(await prepare({ label: 'safe' }));
        definition.parameters = { ...original, properties: { ...original.properties, label: field } };
        const beforeGuard = fixture.state.calls.length;
        denied(await harness.call(name, { label: 'safe' }, agent), /Unsupported|不支持/);
        assert.equal(fixture.state.calls.length, beforeGuard);
        const probe = harness.ctx.tools.get('mcp__gw_blender__get_blendfile_summary_path_info', agent);
        probe.parameters = { type: 'object', properties: { unused: field } };
        const beforeProbe = fixture.state.calls.length;
        denied(await harness.call('game_workshop_editors', { action: 'inspect', editor: 'blender' }, agent), /Unsupported|不支持/);
        assert.equal(fixture.state.calls.length, beforeProbe);
        assert.equal(fixture.state.mutations, 0);
      } finally { if (harness) await harness.close(); await fixture.close(); }
    });
  }
});

// These barriers wait on real HTTP requests / actual policy entry, never sleeps.
for (const newerAction of ['prepare', 'inspect']) {
  test(`pending prepare cannot re-arm after newer ${newerAction}`, { skip: runtime.skip || false, timeout: 10_000 }, async () => {
    const fixture = await startHttpFixture('blender');
    let harness;
    try {
      harness = await makeHarness(runtime, { serverName: 'gw_blender', transport: 'streamable-http', url: fixture.url });
      const agent = harness.agent();
      const edit = { label: 'obsolete preparation' };
      const options = { action: 'prepare', editor: 'blender', expected_project: '/tmp/equipment.blend', next_tool: 'mcp__gw_blender__fake_mutate', next_arguments: edit };
      const firstGate = fixture.deferNextCall();
      const older = harness.call('game_workshop_editors', options, agent);
      await firstGate.entered;
      const secondGate = fixture.deferNextCall();
      const started = harness.policyStarted(args => args.action === newerAction);
      const newer = harness.call('game_workshop_editors', { ...options, action: newerAction, expected_project: '/tmp/not-this-project' }, agent);
      await started; // generation has already changed, despite being queued behind old probe
      firstGate.release();
      denied(await older, /superseded|取代/);
      await secondGate.entered;
      denied(await harness.call(options.next_tool, edit, agent));
      secondGate.release();
      const latest = await newer;
      if (newerAction === 'prepare') denied(latest); else assert.equal(success(latest).prepared, false);
      denied(await harness.call(options.next_tool, edit, agent));
      assert.equal(fixture.state.mutations, 0);
    } finally { fixture.releaseAll(); if (harness) await harness.close(); await fixture.close(); }
  });
}

for (const pendingKind of ['prepare', 'mutation']) {
  test(`cross-editor inspection revokes in-flight ${pendingKind}`, { skip: runtime.skip || false, timeout: 10_000 }, async () => {
    const blender = await startHttpFixture('blender');
    const unity = await startHttpFixture('unity');
    let harness;
    try {
      harness = await makeHarness(runtime, { serverName: 'gw_blender', transport: 'streamable-http', url: blender.url }, trustedProbes);
      await harness.connect({ serverName: 'gw_unity', transport: 'streamable-http', url: unity.url });
      const agent = harness.agent();
      const edit = { label: 'revoked across editors' };
      const options = { action: 'prepare', editor: 'blender', expected_project: '/tmp/equipment.blend', next_tool: 'mcp__gw_blender__fake_mutate', next_arguments: edit };
      if (pendingKind === 'mutation') success(await harness.call('game_workshop_editors', options, agent));
      const gate = blender.deferNextCall();
      const pending = pendingKind === 'prepare' ? harness.call('game_workshop_editors', options, agent) : harness.call(options.next_tool, edit, agent);
      await gate.entered;
      assert.equal(success(await harness.call('game_workshop_editors', { action: 'inspect', editor: 'unity' }, agent)).prepared, false);
      gate.release();
      denied(await pending, /superseded|取代/);
      denied(await harness.call(options.next_tool, edit, agent));
      assert.equal(blender.state.mutations, 0);
      assert.equal(unity.state.mutations, 0);
    } finally { blender.releaseAll(); unity.releaseAll(); if (harness) await harness.close(); await blender.close(); await unity.close(); }
  });
}

test('cancellation on successful probe result cannot arm a reusable proof', { skip: runtime.skip || false, timeout: 10_000 }, async () => {
  const fixture = await startHttpFixture('blender');
  let harness;
  try {
    harness = await makeHarness(runtime, { serverName: 'gw_blender', transport: 'streamable-http', url: fixture.url });
    const agent = harness.agent();
    const controller = new AbortController();
    const stop = harness.ctx.on('tools/result', (exec, result) => {
      if (exec.name === 'mcp__gw_blender__get_blendfile_summary_path_info' && !result.isError) controller.abort();
    });
    const args = { label: 'cancelled preparation' };
    denied(await harness.call('game_workshop_editors', { action: 'prepare', editor: 'blender', expected_project: '/tmp/equipment.blend', next_tool: 'mcp__gw_blender__fake_mutate', next_arguments: args }, agent, controller.signal));
    stop();
    assert.equal(controller.signal.aborted, true);
    denied(await harness.call('mcp__gw_blender__fake_mutate', args, agent));
    // A stored proof is also tied to its original preparation signal.
    const later = new AbortController();
    success(await harness.call('game_workshop_editors', { action: 'prepare', editor: 'blender', expected_project: '/tmp/equipment.blend', next_tool: 'mcp__gw_blender__fake_mutate', next_arguments: args }, agent, later.signal));
    later.abort();
    denied(await harness.call('mcp__gw_blender__fake_mutate', args, agent));
    assert.equal(fixture.state.mutations, 0);
  } finally { if (harness) await harness.close(); await fixture.close(); }
});

test('fixed probe uses guarded pipeline when selected executor rejects bare MCP calls', { skip: runtime.skip || false, timeout: 10_000 }, async () => {
  const fixture = await startHttpFixture('blender');
  let harness;
  try {
    harness = await makeHarness(runtime, { serverName: 'gw_blender', transport: 'streamable-http', url: fixture.url });
    const agent = harness.agent();
    const native = harness.ctx.tools.selectExecutor(agent);
    let bareMcpAttempts = 0;
    const restricted = agent.ctx.plugin({ name: 'restricted-executor-test', inject: ['tools'], apply(inner) { inner.tools.setExecutor({
      describe: definitions => native.describe(definitions),
      execute(input) {
        if (input.calls.some(call => call.name.startsWith('mcp__'))) {
          bareMcpAttempts++;
          throw new Error('Test executor does not accept bare MCP call batches');
        }
        return native.execute(input);
      },
    }); } });
    await restricted.await();
    const inspected = success(await harness.call('game_workshop_editors', { action: 'inspect', editor: 'blender' }, agent));
    assert.deepEqual(inspected.projects, ['/tmp/equipment.blend']);
    assert.equal(bareMcpAttempts, 0);
    const before = fixture.state.calls.length;
    const denyProbe = harness.ctx.tools.guard(exec => exec.name === 'mcp__gw_blender__get_blendfile_summary_path_info' ? 'Synthetic permission denial' : undefined);
    denied(await harness.call('game_workshop_editors', { action: 'inspect', editor: 'blender' }, agent), /Synthetic permission denial/);
    assert.equal(fixture.state.calls.length, before); // custom dispatch still obeys DSH guards
    denyProbe();
  } finally { if (harness) await harness.close(); await fixture.close(); }
});

test('actual DSH refuses unaudited Unreal identity probe', { skip: runtime.skip || false, timeout: 10_000 }, async () => {
  const fixture = await startHttpFixture('unreal');
  let harness;
  try {
    harness = await makeHarness(runtime, { serverName: 'gw_unreal', transport: 'streamable-http', url: fixture.url });
    const agent = harness.agent();
    denied(await harness.call('game_workshop_editors', { action: 'inspect', editor: 'unreal' }, agent), /audited|审核/);
    denied(await harness.call('mcp__gw_unreal__fake_mutate', { label: 'must not run' }, agent));
    assert.equal(fixture.state.mutations, 0);
    assert.equal(fixture.state.probes, 0);
  } finally { if (harness) await harness.close(); await fixture.close(); }
});
