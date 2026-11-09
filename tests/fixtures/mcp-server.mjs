import http from 'node:http';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

/** Synthetic editor only: never imports, launches, or locates an actual editor. */
export function fakeEditor(editor = 'unity') {
  const projects = { unity: '/tmp/workshop-unity', blender: '/tmp/equipment.blend', unreal: '/tmp/workshop-ue' };
  const state = { project: projects[editor], mutations: 0, probes: 0, calls: [] };
  const probe = { unity: 'audited_project', blender: 'get_blendfile_summary_path_info', unreal: 'audited_project' }[editor];
  if (!probe) throw new Error(`Unknown fixture editor: ${editor}`);
  const tools = [
    { name: probe, description: 'Read synthetic project identity', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true } },
    { name: 'fake_mutate', description: 'Increment an in-memory fixture counter only', inputSchema: { type: 'object', properties: { label: { type: 'string' }, fail: { type: 'boolean' } }, required: ['label'], additionalProperties: false } },
  ];
  if (editor === 'unity') tools.push({ name: 'unity-status', description: 'List ready editors; does not prove selected target', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true } });
  function reply(message) {
    if (message.id === undefined) return null;
    const result = value => ({ jsonrpc: '2.0', id: message.id, result: value });
    const error = (code, text) => ({ jsonrpc: '2.0', id: message.id, error: { code, message: text } });
    if (message.method === 'server/discover') return error(-32601, 'Legacy fixture uses initialize');
    if (message.method === 'initialize') return result({ protocolVersion: '2025-11-25', serverInfo: { name: `workshop-${editor}-fixture`, version: '0.1.0' }, capabilities: { tools: {} } });
    if (message.method === 'ping') return result({});
    if (message.method === 'tools/list') return result({ tools });
    if (message.method !== 'tools/call') return error(-32601, 'Method not found');
    const { name, arguments: args = {} } = message.params;
    state.calls.push({ name, arguments: args });
    let value;
    if (name === probe || (editor === 'unity' && name === 'unity-status')) {
      if (args === null || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length) return error(-32602, 'Probe requires empty arguments');
      state.probes++;
      value = name === 'unity-status' ? { success: true, data: { items: [{ projectPath: state.project, state: 'ready' }] } }
        : editor === 'blender' ? { status: 'ok', filepath: state.project, is_saved: Boolean(state.project) }
          : { project: state.project };
    } else if (name === 'fake_mutate') {
      if (args === null || typeof args !== 'object' || Array.isArray(args) || typeof args.label !== 'string' || (args.fail !== undefined && typeof args.fail !== 'boolean') || Object.keys(args).some(key => !['label', 'fail'].includes(key))) return error(-32602, 'Invalid fake_mutate arguments: label must be string');
      if (args.fail) return result({ isError: true, content: [{ type: 'text', text: 'Synthetic editor refused mutation' }] });
      value = { mutations: ++state.mutations, label: args.label, project: state.project };
    } else return error(-32602, 'Unknown fixture tool');
    return result({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
  }
  return { reply, state, probe, tools };
}

/** HTTP transport uses an ephemeral loopback port, never UE's real default port. */
export async function startHttpFixture(editor) {
  const fixture = fakeEditor(editor);
  const gates = [];
  const deferNextCall = (name = fixture.probe) => {
    let entered, release;
    const arrived = new Promise(resolve => { entered = resolve; });
    const released = new Promise(resolve => { release = resolve; });
    const gate = { name, arrived, entered, released, release, claimed: false };
    gates.push(gate);
    return { entered: arrived, release };
  };
  const releaseAll = () => { for (const gate of gates) gate.release(); };
  const server = http.createServer(async (request, response) => {
    if (request.url !== '/mcp') { response.writeHead(404).end(); return; }
    if (request.method !== 'POST') { response.writeHead(405).end(); return; }
    try {
      let body = '';
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 1_000_000) throw new Error('Fixture request too large');
      }
      const message = JSON.parse(body);
      const gate = message.method === 'tools/call' && gates.find(item => !item.claimed && item.name === message.params?.name);
      if (gate) { gate.claimed = true; gate.entered(); await gate.released; }
      const reply = fixture.reply(message);
      if (reply === null) { response.writeHead(202).end(); return; }
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(reply));
    } catch {
      response.writeHead(400).end();
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { ...fixture, deferNextCall, releaseAll, url: `http://127.0.0.1:${server.address().port}/mcp`, close() { releaseAll(); return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Every SDK negotiation sibling gets fresh synthetic state. stdout is JSON-RPC only.
  const fixture = fakeEditor(process.argv[2] ?? 'unity');
  const input = readline.createInterface({ input: process.stdin });
  input.on('line', line => {
    try { const reply = fixture.reply(JSON.parse(line)); if (reply !== null) process.stdout.write(`${JSON.stringify(reply)}\n`); }
    catch { process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`); }
  });
}
