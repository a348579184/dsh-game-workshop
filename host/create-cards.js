import { renderGame } from '../game/render.js';

/** Deliberately permits one basename only: generated games stay in the session cwd. */
export function validateFilename(value = '雾岭灵契.html') {
  if (typeof value !== 'string' || new TextEncoder().encode(value).length > 200 || !value.endsWith('.html') ||
      /[\\/\x00-\x1f\x7f<>:"|?*]/u.test(value) || value.startsWith('.') || value.trim() !== value ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./iu.test(value)) {
    throw new Error('输出文件名须为不含目录的 .html 文件名，例如 我的灵兽.html / Use a plain .html filename.');
  }
  return value;
}

export async function createCards(ctx, args, exec) {
  if (!exec.agent) throw new Error('请在已选择工作区的 DSH 会话中调用 / A workspace session is required.');
  exec.signal.throwIfAborted();
  const filename = validateFilename(args.filename);
  const scope = exec.agent.ctx ?? ctx;
  const cwd = await (scope.get('workingDirectory') ?? ctx.workingDirectory).ensure(exec.agent, exec.signal);
  const fs = scope.get('fs') ?? ctx.fs;
  // lstat rejects dangling symlinks as well as existing files and directories.
  if (await fs.lstat(filename, { cwd }, exec.signal)) {
    throw new Error(`文件名已被占用，请换名；不会覆盖文件、目录或链接 / Choose another filename: ${filename}`);
  }
  const root = await fs.resolve(cwd, { signal: exec.signal });
  const target = await fs.resolve(filename, { cwd, signal: exec.signal });
  if (!fs.contains(root, target)) throw new Error('输出必须在当前会话工作目录内 / Output must remain inside the session working directory.');
  if (await fs.stat(target, exec.signal)) {
    throw new Error(`文件已存在，请换一个文件名；不会覆盖 / File already exists; choose another name: ${target.displayPath}`);
  }
  const html = renderGame({ title: args.title, cards: args.cards, seed: args.seed, language: args.language ?? 'zh' });
  ctx.emit('fs/observed', target, { kind: 'absent' }, exec);
  // Dispatch the host policy, but never weaken our own atomic create-only invariant.
  await ctx.waterfall('fs/write-intent', target, exec, () => undefined);
  const sandboxPolicy = scope.get('sandboxPolicy');
  if (fs.sandboxMode !== undefined && !sandboxPolicy) throw new Error('缺少 DSH 会话文件权限服务 / Missing session sandbox policy.');
  const policy = fs.sandboxMode === undefined ? undefined : sandboxPolicy.resolve({ session: exec.agent.session });
  let outcome;
  try {
    outcome = await fs.writeText(target, html, { kind: 'createIfAbsent' }, exec.signal, policy);
  } catch (error) {
    if (error.code === 'FS_STALE_VERSION' || error.code === 'FS_NOT_OBSERVED') throw new Error(`文件已存在或刚被创建，请换名；未覆盖 / Choose another filename: ${target.displayPath}`, { cause: error });
    throw error;
  }
  ctx.emit('fs/observed', target, { kind: 'present', version: outcome.version }, exec);
  return { path: fs.processPath(target), bytes: new TextEncoder().encode(html).length, message: '已新建离线游戏，可打开 HTML 试玩；浏览器自动保存进度 / Offline game created; open the HTML to play.' };
}
