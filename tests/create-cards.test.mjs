import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lstat, mkdir, mkdtemp, readFile, realpath, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createCards, validateFilename } from '../host/create-cards.js';
import { loadDsh, runtimeRoot } from './helpers/dsh.mjs';

// Uses real DSH Cordis, SessionStore, projection registry, working-directory,
// fs-sandbox (which extends fs-local), sandbox policy, and observation policy.
// Only the Agent's LLM loop / message injection is replaced by a tiny scoped
// identity carrier. No persistent profile or live application session is touched.
const runtime = await loadDsh();
let services;
if (!runtime.skip) {
  const require = createRequire(join(runtimeRoot, 'package.json'));
  const load = name => import(pathToFileURL(require.resolve(name)).href);
  const [fsLocal, fsSandbox, workingDirectory, sandboxPolicy, projections, sessions, observation] = await Promise.all([
    load('@deepseek-ai/dsh-fs-local'), load('@deepseek-ai/dsh-fs-sandbox'),
    load('@deepseek-ai/dsh-working-directory'), load('@deepseek-ai/dsh-sandbox-policy'),
    load('@deepseek-ai/dsh-session-projection'), load('@deepseek-ai/dsh-session'),
    load('@deepseek-ai/dsh-fs-observation-policy'),
  ]);
  services = { fsLocal, fsSandbox, workingDirectory, sandboxPolicy, projections, sessions, observation };
}

async function fixture(t, { sandbox = true, mode = 'danger-full-access' } = {}) {
  const tempParent = await realpath(tmpdir());
  const created = await mkdtemp(join(tempParent, 'dsh-workshop-create-test-'));
  const root = await realpath(created);
  assert.ok(isAbsolute(root)); assert.equal(dirname(root), tempParent); assert.ok(basename(root).startsWith('dsh-workshop-create-test-'));
  const ctx = new runtime.cordis.Context(), fibers = [], scopes = [];
  let closed = false;
  async function close() {
    if (closed) return; closed = true;
    try {
      for (const scope of scopes.reverse()) await scope.dispose();
      for (const fiber of fibers.reverse()) await fiber.dispose();
    } finally {
      // Verify the exact canonical directory returned by our own mkdtemp before
      // recursive removal. Never derive cleanup from user/plugin output paths.
      const target = await realpath(root);
      assert.equal(target, root); assert.equal(dirname(target), tempParent);
      assert.ok(basename(target).startsWith('dsh-workshop-create-test-'));
      await rm(target, { recursive: true, force: true });
    }
  }
  t.after(close);
  const mount = async (plugin, config = {}) => { const fiber = ctx.plugin(plugin, config); fibers.push(fiber); await fiber.await(); return fiber; };
  const directories = { root, backend: join(root, 'backend-default'), fallback: join(root, 'deployment-default'), workspace: join(root, 'session-workspace') };
  await Promise.all(Object.values(directories).filter(path => path !== root).map(path => mkdir(path)));
  await mount(services.sessions.default);
  await mount(services.projections.default);
  await mount(runtime.prompt.default);
  await mount(services.sandboxPolicy.default, { mode, workspaceRoot: directories.fallback });
  await mount(sandbox ? services.fsSandbox.default : services.fsLocal.default, { cwd: directories.backend });
  await mount(services.workingDirectory.default, { defaultDirectory: directories.fallback });
  await mount(services.observation);
  const observations = [];
  ctx.on('fs/observed', (target, observation, exec) => observations.push({ target, observation, exec }));
  function agent(cwd = directories.workspace) {
    const session = ctx.sessions.create('creator-test-' + randomUUID(), { meta: { cwd } });
    const notices = [];
    const value = { session, inject: message => notices.push(message), notices };
    const scoped = runtime.scope.createScope(ctx, value); value.ctx = scoped.ctx; scopes.push(scoped);
    return value;
  }
  const owner = agent();
  const call = (args = {}, value = owner, signal = new AbortController().signal) => createCards(ctx, args, { agent: value, signal });
  return { ...directories, ctx, owner, agent, call, observations, close, mount };
}

function embeddedConfig(html) {
  // Evaluate only the argument list at the standalone script's call site. The
  // boot function itself becomes a capture callback; no DOM or network exists.
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'generated game contains a self-contained script');
  new vm.Script(script);
  const boundary = script.indexOf('})(');
  assert.ok(boundary > 0);
  const capture = '(function capture(config) { return config; })' + script.slice(boundary + 2);
  return JSON.parse(JSON.stringify(vm.runInNewContext(capture, {}, { timeout: 2000 })));
}

async function assertMissing(path) { await assert.rejects(lstat(path), error => error.code === 'ENOENT'); }

// These checks still run in a public checkout without the optional DSH runtime.
test('creator filename accepts a plain HTML basename and rejects traversal/reserved names', () => {
  assert.equal(validateFilename(), '雾岭灵契.html');
  for (const name of ['我的灵兽.html', 'my-original-game.html', 'hello world.html']) assert.equal(validateFilename(name), name);
  for (const name of ['../escape.html', '..\\escape.html', '/tmp/escape.html', 'C:\\escape.html', 'nested/game.html', '.hidden.html', ' game.html', 'game.html ', 'game.HTML', 'game.txt', 'x\0.html', 'x\n.html', '<img>.html', 'CON.html', 'nul.html', 'LPT1.html', 'a'.repeat(201) + '.html', 123, null]) {
    assert.throws(() => validateFilename(name), /plain \.html filename/);
  }
});

test('creator integrates with real DSH Session/working-directory/filesystem services', { skip: runtime.skip || false, timeout: 30000 }, async t => {
  const h = await fixture(t);
  assert.ok(h.ctx.fs instanceof services.fsSandbox.SandboxedFileSystem);
  assert.ok(h.ctx.fs instanceof services.fsLocal.LocalFileSystem);
  assert.ok(h.owner.session instanceof services.sessions.Session);

  await t.test('custom title/cards/seed use session cwd, not process cwd or provider/deployment fallback', async () => {
    const filename = 'custom-' + randomUUID() + '.html';
    const options = { filename, title: '松月小契', seed: 'workspace-seed-73', language: 'en', cards: [{ name: 'Moss Sprite', description: 'A new original companion.', attack: 28, health: 123, color: '#12abcd' }] };
    const result = await h.call(options);
    assert.equal(result.path, join(h.workspace, filename));
    assert.notEqual(dirname(result.path), process.cwd());
    const text = await readFile(result.path, 'utf8');
    assert.equal(result.bytes, Buffer.byteLength(text)); assert.ok(text.startsWith('<!doctype html>'));
    const config = embeddedConfig(text);
    assert.equal(config.title, options.title); assert.equal(config.seed, options.seed); assert.equal(config.language, 'en');
    assert.equal(config.cards.length, 6); assert.deepEqual(config.cards[0], { name: 'Moss Sprite', description: 'A new original companion.', attack: 28, health: 123, color: '#12abcd' });
    assert.ok(text.includes('MIT License')); assert.ok(text.includes('localStorage')); assert.ok(text.includes('new Blob'));
    await assertMissing(join(h.backend, filename)); await assertMissing(join(h.fallback, filename)); await assertMissing(join(process.cwd(), filename));
    const events = h.observations.filter(event => event.target.displayPath === result.path);
    assert.deepEqual(events.map(event => event.observation.kind), ['absent', 'present']);
    assert.equal(events[1].exec.agent, h.owner); assert.ok(events[1].observation.version);
  });

  await t.test('current working-directory projection wins after an actual DSH directory change', async () => {
    const nested = join(h.workspace, 'changed-cwd'); await mkdir(nested);
    const value = h.agent();
    await h.ctx.workingDirectory.set(value, nested, new AbortController().signal);
    assert.equal(h.ctx.workingDirectory.get(value.session), nested);
    assert.equal(value.session.header.cwd, h.workspace, 'immutable creation cwd stays unchanged');
    assert.equal(value.notices.length, 1);
    const result = await h.call({ filename: 'after-cd.html' }, value);
    assert.equal(result.path, join(nested, 'after-cd.html')); await assertMissing(join(h.workspace, 'after-cd.html'));
  });

  await t.test('another real session writes only into its own workspace', async () => {
    const workspace = join(h.root, 'second-workspace'); await mkdir(workspace);
    const value = h.agent(workspace), result = await h.call({ filename: 'second-session.html' }, value);
    assert.equal(result.path, join(workspace, 'second-session.html')); await assertMissing(join(h.workspace, 'second-session.html'));
  });

  await t.test('existing regular file remains byte-for-byte unchanged', async () => {
    const target = join(h.workspace, 'already.html'), bytes = Buffer.from('original\0not-even-html\n');
    await writeFile(target, bytes); const before = await lstat(target);
    await assert.rejects(h.call({ filename: 'already.html', title: 'Do not overwrite' }), /Choose another filename|already exists/);
    assert.deepEqual(await readFile(target), bytes); assert.equal((await lstat(target)).ino, before.ino);
  });

  await t.test('directory, symlink, and dangling symlink names are refused without following links', async () => {
    const folder = join(h.workspace, 'folder.html'); await mkdir(folder); await writeFile(join(folder, 'marker'), 'keep folder');
    await assert.rejects(h.call({ filename: 'folder.html' }), /Choose another filename/);
    assert.equal(await readFile(join(folder, 'marker'), 'utf8'), 'keep folder');
    const destination = join(h.root, 'outside-original.txt'); await writeFile(destination, 'keep link target');
    const link = join(h.workspace, 'link.html'), dangling = join(h.workspace, 'dangling.html'), absent = join(h.root, 'must-not-create.txt');
    await symlink(destination, link); await symlink(absent, dangling);
    await assert.rejects(h.call({ filename: 'link.html' }), /Choose another filename/);
    await assert.rejects(h.call({ filename: 'dangling.html' }), /Choose another filename/);
    assert.ok((await lstat(link)).isSymbolicLink()); assert.ok((await lstat(dangling)).isSymbolicLink());
    assert.equal(await readFile(destination, 'utf8'), 'keep link target'); await assertMissing(absent);
  });

  await t.test('traversal is refused before filesystem observations or writes', async () => {
    const count = h.observations.length;
    for (const filename of ['../escape.html', '..\\escape.html', join(h.root, 'absolute.html'), 'nested/escape.html']) await assert.rejects(h.call({ filename }), /plain \.html filename/);
    assert.equal(h.observations.length, count); await assertMissing(join(h.root, 'escape.html')); await assertMissing(join(h.root, 'absolute.html'));
  });

  await t.test('concurrent same-name calls both pass preflight, but only one atomically creates', async () => {
    const filename = 'racing-create.html'; let arrived = 0, release, reject;
    const barrier = new Promise((resolve, fail) => { release = resolve; reject = fail; });
    const timeout = setTimeout(() => reject(new Error('Both concurrent calls did not reach the write-intent barrier')), 5000);
    const dispose = h.ctx.on('fs/write-intent', async (target, exec, next) => {
      if (basename(target.displayPath) === filename) { if (++arrived === 2) release(); await barrier; }
      return next();
    }, { prepend: true });
    try {
      const results = await Promise.allSettled([h.call({ filename, title: 'Winner A' }, h.agent()), h.call({ filename, title: 'Winner B' }, h.agent())]);
      assert.equal(arrived, 2); assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(results.filter(r => r.status === 'rejected').length, 1);
      const successful = results.find(r => r.status === 'fulfilled').value;
      assert.equal(successful.path, join(h.workspace, filename));
      const config = embeddedConfig(await readFile(successful.path, 'utf8')); assert.ok(['Winner A', 'Winner B'].includes(config.title));
      const loser = results.find(r => r.status === 'rejected').reason;
      assert.match(loser.message, /Choose another filename|overwrite|already exists/i);
      assert.equal((await readdir(h.workspace)).filter(name => name === filename).length, 1);
    } finally { clearTimeout(timeout); await dispose(); }
  });

  await t.test('session read-only mode overrides danger-full-access deployment default', async () => {
    const value = h.agent(); assert.equal(h.ctx.fs.sandboxMode, 'danger-full-access');
    services.sandboxPolicy.setSandboxMode(value.session, 'read-only');
    assert.equal(h.ctx.sandboxPolicy.resolve({ session: value.session }).mode, 'read-only');
    await assert.rejects(h.call({ filename: 'denied-read-only.html' }, value), error => error.code === 'FS_SANDBOX_DENIED' && /read-only/.test(error.message));
    await assertMissing(join(h.workspace, 'denied-read-only.html'));
    // A different session retains its own mode; the denial must not broaden or
    // contaminate either session's standing policy.
    assert.equal(h.ctx.sandboxPolicy.resolve({ session: h.owner.session }).mode, 'danger-full-access');
    assert.equal(h.ctx.sandboxPolicy.resolve({ session: value.session }).mode, 'read-only');
    services.sandboxPolicy.setSandboxMode(value.session, 'workspace-write');
    const result = await h.call({ filename: 'session-workspace-write.html' }, value);
    assert.equal(result.path, join(h.workspace, 'session-workspace-write.html'));
    assert.equal(h.ctx.sandboxPolicy.resolve({ session: value.session }).workspaceRoot, h.workspace);
  });

  await t.test('aborted requests never create a file, both before and during dispatch', async () => {
    const first = new AbortController(); first.abort(new Error('test-cancel-before'));
    await assert.rejects(h.call({ filename: 'cancel-before.html' }, h.owner, first.signal), /test-cancel-before/);
    await assertMissing(join(h.workspace, 'cancel-before.html'));
    const during = new AbortController();
    const dispose = h.ctx.on('fs/write-intent', async (target, exec, next) => { if (basename(target.displayPath) === 'cancel-during.html') during.abort(new Error('test-cancel-during')); return next(); }, { prepend: true });
    try { await assert.rejects(h.call({ filename: 'cancel-during.html' }, h.owner, during.signal), error => error.code === 'FS_ABORTED' || /test-cancel-during/.test(error.message)); }
    finally { await dispose(); }
    await assertMissing(join(h.workspace, 'cancel-during.html'));
  });

  await t.test('missing agent is rejected instead of silently writing into process.cwd', async () => {
    await assert.rejects(createCards(h.ctx, { filename: 'no-agent.html' }, { signal: new AbortController().signal }), /workspace session is required/);
    await assertMissing(join(process.cwd(), 'no-agent.html'));
  });
});

test('real DSH sandbox default denies writes, while a per-session override allows them', { skip: runtime.skip || false, timeout: 15000 }, async t => {
  const h = await fixture(t, { mode: 'read-only' });
  assert.equal(h.ctx.fs.sandboxMode, 'read-only');
  await assert.rejects(h.call({ filename: 'default-denied.html' }), error => error.code === 'FS_SANDBOX_DENIED');
  await assertMissing(join(h.workspace, 'default-denied.html'));
  services.sandboxPolicy.setSandboxMode(h.owner.session, 'workspace-write');
  const result = await h.call({ filename: 'session-allowed.html' });
  assert.equal(result.path, join(h.workspace, 'session-allowed.html'));
  assert.equal(h.ctx.fs.sandboxMode, 'read-only', 'deployment fact is not mutated by a session override');
});

test('actual root host plugin registers and executes through DSH ToolRuntime and NativeToolExecutor', { skip: runtime.skip || false, timeout: 15000 }, async t => {
  const require = createRequire(join(runtimeRoot, 'package.json'));
  // Load the shipped entrypoint unchanged. Hooks supply only the deployment's
  // actual package resolver, rather than rewriting imports or creating mocks.
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(specifier.startsWith('@deepseek-ai/') ? require.resolve(specifier) : specifier, context);
    },
  });
  let plugin;
  try { plugin = await import('../index.js'); }
  finally { hooks.deregister(); }
  assert.equal(plugin.name, 'game-workshop');
  assert.deepEqual(plugin.inject, ['tools', 'fs', 'workingDirectory']);
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.exports['.'], './index.js');
  assert.equal(manifest.type, 'module');
  assert.equal(typeof plugin.Config, 'function');
  const config = plugin.Config({});
  // Exercise the actual Schemastery Config, including secure defaults and
  // rejection of the wrong permission-probe type, not a copied test schema.
  assert.notEqual(config.unrealProbe?.auditedReadOnly, true);
  assert.deepEqual(plugin.Config({ unrealProbe: {} }).unrealProbe, { tool: '', arguments: {}, identityPointer: '', auditedReadOnly: false });
  assert.throws(() => plugin.Config({ unrealProbe: { auditedReadOnly: 'yes' } }));
  const explicit = plugin.Config({ unrealProbe: { tool: 'read_project', arguments: { scope: 'current' }, identityPointer: '/project/path', auditedReadOnly: true } });
  assert.equal(explicit.unrealProbe.auditedReadOnly, true);
  assert.deepEqual(explicit.unrealProbe.arguments, { scope: 'current' });
  const h = await fixture(t);
  await h.mount(runtime.tools.default);
  await h.mount(runtime.executor);
  await h.mount(plugin, config);
  const schemas = h.ctx.tools.schemas(h.owner);
  assert.ok(schemas.some(tool => tool.name === 'game_workshop_create_cards'));
  assert.ok(schemas.some(tool => tool.name === 'game_workshop_editors'));
  async function execute(name, args = {}) {
    const batch = await h.ctx.tools.execute({ calls: [{ id: randomUUID(), name, arguments: JSON.stringify(args) }], agent: h.owner, signal: new AbortController().signal, maxParallelToolCalls: 1 });
    assert.equal(batch.results.length, 1);
    return batch.results[0].result;
  }
  const result = await execute('game_workshop_create_cards', { filename: 'registered-tool.html', title: '工具注册实测', cards: [{ name: '松月鹿', description: '原创山灵' }], seed: 73 });
  assert.notEqual(result.isError, true, JSON.stringify(result));
  assert.equal(result.value.path, join(h.workspace, 'registered-tool.html'));
  assert.equal(await realpath(result.value.path), result.value.path, 'tool returns a canonical absolute path');
  const before = await readFile(result.value.path);
  assert.equal(result.value.bytes, before.byteLength);
  const generated = embeddedConfig(before.toString('utf8'));
  assert.equal(generated.title, '工具注册实测'); assert.equal(generated.cards[0].name, '松月鹿'); assert.equal(generated.seed, '73');
  const duplicate = await execute('game_workshop_create_cards', { filename: 'registered-tool.html', title: 'must not overwrite' });
  assert.equal(duplicate.isError, true); assert.match(JSON.stringify(duplicate), /Choose another filename|already exists/);
  assert.deepEqual(await readFile(result.value.path), before);
  const editors = await execute('game_workshop_editors', { action: 'list' });
  assert.notEqual(editors.isError, true, JSON.stringify(editors));
  assert.deepEqual(editors.value.editors.map(row => row.editor).sort(), ['blender', 'unity', 'unreal']);
  for (const row of editors.value.editors) assert.deepEqual(row.tools, [], 'no MCP connection is started by the host plugin');
  const tooMany = await execute('game_workshop_create_cards', { filename: 'too-many.html', cards: Array.from({ length: 7 }, (_, index) => ({ name: 'Spirit ' + index })) });
  assert.equal(tooMany.isError, true); assert.match(JSON.stringify(tooMany), /1–6/); await assertMissing(join(h.workspace, 'too-many.html'));
  const empty = await execute('game_workshop_create_cards', { filename: 'empty-cards.html', cards: [] });
  assert.equal(empty.isError, true); await assertMissing(join(h.workspace, 'empty-cards.html'));
  const invalid = await execute('game_workshop_create_cards', { filename: 'invalid-schema.html', cards: [{ description: 'missing required name' }] });
  assert.equal(invalid.isError, true, 'real tool schema validates nested required card names'); await assertMissing(join(h.workspace, 'invalid-schema.html'));
});

test('compiled client renderer still produces independently executable function-source HTML', { timeout: 5000 }, async t => {
  let bundle;
  try { bundle = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') { t.skip('Optional built dist/client.js absent; build the client to verify compiled function.toString portability.'); return; } throw error; }
  const end = bundle.lastIndexOf('})();');
  assert.ok(end > 0, 'expected the built client IIFE');
  // Expose a private function for this test without changing its generated
  // body/dependencies or writing a modified build artifact to disk.
  const instrumented = bundle.slice(0, end) + '\nglobalThis.__compiledRender = renderGame;\n' + bundle.slice(end);
  const moduleIds = [];
  const sandbox = { window: { __ModuleLoader__: { load: definition => moduleIds.push(definition.id) } } };
  vm.runInNewContext(instrumented, sandbox, { timeout: 2000 });
  assert.ok(moduleIds.includes('dsh-game-workshop'));
  const html = sandbox.__compiledRender({ language: 'en', title: 'Bundled <mountain>', seed: 'compiled-seed' });
  assert.equal(embeddedConfig(html).seed, 'compiled-seed');
  const nodes = new Map(['game-root', 'battle-root', 'modal', 'toast', 'mist-save'].map(id => [id, { innerHTML: '', textContent: id === 'mist-save' ? 'null' : '', addEventListener() {}, classList: { add() {}, remove() {} } }]));
  const storage = new Map();
  const environment = {
    window: {}, document: { getElementById: id => nodes.get(id) || null, addEventListener() {} },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setTimeout: () => 0, clearTimeout() {}, matchMedia: () => ({ matches: true }),
  };
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], environment, { timeout: 2000 });
  assert.equal(environment.window.__MISTBOUND_READY__, true);
  assert.ok(nodes.get('game-root').innerHTML.includes('Bundled &lt;mountain&gt;'));
  assert.ok(nodes.get('game-root').innerHTML.includes('data-testid="merge-button"'));
  assert.equal(storage.size, 1);
});

test('real unsandboxed DSH fs-local also uses atomic create-only writes', { skip: runtime.skip || false, timeout: 15000 }, async t => {
  const h = await fixture(t, { sandbox: false });
  assert.equal(h.ctx.fs.sandboxMode, undefined);
  const result = await h.call({ filename: 'local-only.html', seed: 'local-provider' });
  assert.equal(result.path, join(h.workspace, 'local-only.html'));
  const before = await readFile(result.path);
  await assert.rejects(h.call({ filename: 'local-only.html' }), /Choose another filename/);
  assert.deepEqual(await readFile(result.path), before);
});
