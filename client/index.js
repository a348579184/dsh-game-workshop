import { renderGame } from '../game/render.js';
import zh from '../locale/zh.json';
import en from '../locale/en.json';

const PROMPT = '请调用 game_workshop_create_cards，在我当前选择的工作区新建一个可离线玩的卡牌游戏。标题：星海灵契；卡组：星鲸、月狐、晶鹿、云鹤、岩龟、萤蝶（请为它们写原创中文描述）；随机种子：星海-2026；输出文件名：星海灵契.html。保留抽卡、三合一升星、装备和三关自动战斗。如文件已存在，请先让我换名，不要覆盖。';
const STYLE = `
.gw-page{box-sizing:border-box;height:100%;overflow:auto;padding:calc(var(--dsh-frame-top-clearance,0px) + 28px) clamp(20px,4vw,52px) 36px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base,Canvas);font:14px/1.65 var(--dsw-font-family,system-ui);scrollbar-gutter:stable}
.gw-page *{box-sizing:border-box}.gw-wrap{max-width:1140px;margin:0 auto}.gw-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px}.gw-heading h1{font-size:27px;letter-spacing:-.7px;line-height:1.3;margin:3px 0 7px;font-weight:650}.gw-eyebrow{font-size:11px;letter-spacing:1.6px;color:var(--dsw-alias-label-secondary);text-transform:uppercase}.gw-muted{color:var(--dsw-alias-label-secondary);margin:0}.gw-version{font:12px/1.2 ui-monospace,monospace;border:1px solid var(--dsw-alias-border-l1,GrayText);padding:7px 10px;border-radius:9px;color:var(--dsw-alias-label-secondary);white-space:nowrap}.gw-hero{position:relative;isolation:isolate;overflow:hidden;border-radius:20px;background:#143d38;color:#f4f0dc;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(220px,.8fr);padding:38px 38px 32px;gap:20px}.gw-hero::before{content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 85% 20%,#2f736157,transparent 65%),linear-gradient(125deg,transparent,#092a2859)}.gw-hero h2{font-family:ui-serif,'Songti SC','Noto Serif CJK SC',serif;font-size:clamp(35px,4.5vw,56px);font-weight:600;letter-spacing:7px;line-height:1.25;margin:14px 0}.gw-hero p{color:#bed8cc;max-width:560px;font-size:14px;line-height:1.9;margin:0 0 24px}.gw-sample-label{display:inline-flex;gap:8px;align-items:center;color:#e5ca8d;font-size:11px;letter-spacing:2px}.gw-sample-label:before{content:'';width:5px;height:5px;border-radius:50%;background:#e5ca8d}.gw-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.gw-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--dsw-alias-border-l1,GrayText);background:transparent;color:inherit;border-radius:10px;padding:9px 16px;font:inherit;font-size:13px;font-weight:550;line-height:1.5;cursor:pointer;text-decoration:none;min-height:39px}.gw-btn:hover{background:var(--dsw-alias-bg-hover,color-mix(in srgb,currentColor 7%,transparent))}.gw-btn:focus-visible,.gw-prompt:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,Highlight);outline-offset:3px}.gw-btn-primary{background:#e6c88e;border-color:#e6c88e;color:#153d37}.gw-btn-primary:hover{background:#f4dba9}.gw-btn-hero{border-color:#54796b;color:#edf0df}.gw-btn-hero:hover{background:#ffffff10}.gw-art{width:100%;max-width:340px;align-self:center;justify-self:center;filter:drop-shadow(0 15px 24px #08231f66)}.gw-features{display:flex;gap:20px;flex-wrap:wrap;font-size:11px;color:#b0cfc0;margin-top:22px}.gw-features span{display:flex;align-items:center;gap:6px}.gw-dot{width:4px;height:4px;border:1px solid #b8aa7a;transform:rotate(45deg)}.gw-section{padding:29px 0 3px}.gw-section h2{font-size:18px;line-height:1.5;font-weight:600;letter-spacing:-.3px;margin:0 0 7px}.gw-section .gw-muted{font-size:13px;max-width:900px}.gw-prompt{display:block;resize:vertical;width:100%;min-height:118px;margin:16px 0 12px;padding:15px 17px;border:1px solid var(--dsw-alias-border-l1,GrayText);border-radius:12px;background:var(--dsw-alias-bg-l1,Canvas);color:var(--dsw-alias-label-primary,CanvasText);font:13px/1.8 var(--dsw-font-family,system-ui)}.gw-copy-status{font-size:12px;color:var(--dsw-alias-label-secondary);min-height:20px}.gw-editors{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:17px 0 13px}.gw-editor{border:1px solid var(--dsw-alias-border-l1,GrayText);border-radius:13px;padding:16px}.gw-editor strong{font-size:13px;font-weight:600;display:block;margin-bottom:6px}.gw-editor small{font-size:11px;color:var(--dsw-alias-label-secondary);display:block}.gw-editor .gw-off{display:inline-flex;font-size:10px;gap:5px;align-items:center;padding:3px 7px;background:var(--dsw-alias-bg-l2,color-mix(in srgb,currentColor 6%,transparent));border-radius:6px;margin-top:11px;color:var(--dsw-alias-label-secondary)}.gw-off:before{content:'';width:4px;height:4px;background:currentColor;border-radius:50%}.gw-safety{font-size:12px;color:var(--dsw-alias-label-secondary)}.gw-link{font-size:12px;color:var(--dsw-alias-state-business-primary,LinkText);text-underline-offset:3px}.gw-footer{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;margin-top:26px;padding-top:17px;border-top:1px solid var(--dsw-alias-border-l1,GrayText);font-size:11px;color:var(--dsw-alias-label-secondary)}.gw-gamebar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:0 0 13px}.gw-gamebar h2{font-size:18px;font-weight:600;margin:0}.gw-game{display:block;width:100%;height:780px;max-height:85vh;min-height:480px;border:1px solid var(--dsw-alias-border-l1,GrayText);border-radius:16px;background:#0c2423}.gw-game-note{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:9px}.gw-visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:850px){.gw-hero{grid-template-columns:1fr;padding:26px}.gw-art{display:none}.gw-editors{grid-template-columns:1fr}.gw-page{padding-left:20px;padding-right:20px}.gw-heading h1{font-size:23px}.gw-hero h2{font-size:40px}.gw-game{height:760px;max-height:none}.gw-heading{margin-bottom:18px}.gw-hero p{max-width:none}}
@media(prefers-reduced-motion:reduce){.gw-page *{scroll-behavior:auto!important}}
`;

window.__ModuleLoader__.load({
  id: 'dsh-game-workshop',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    function Icon({ size = 18 }) {
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
        h('rect', { x: 5, y: 3, width: 14, height: 18, rx: 3 }),
        h('path', { d: 'm12 7 1.5 3.5L17 12l-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-1.5Z' }));
    }
    function Art({ label }) {
      return h('svg', { className: 'gw-art', viewBox: '0 0 340 300', role: 'img', 'aria-label': label },
        h('defs', null, h('linearGradient', { id: 'gw-art-card', x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { stopColor: '#ecedcf' }), h('stop', { offset: '1', stopColor: '#c2d0b6' }))),
        h('circle', { cx: 178, cy: 143, r: 111, fill: 'none', stroke: '#81b798', strokeOpacity: .3 }),
        h('circle', { cx: 178, cy: 143, r: 90, fill: 'none', stroke: '#81b798', strokeOpacity: .25, strokeDasharray: '2 10' }),
        h('path', { d: 'M13 237 70 173 102 206 158 118 234 221 275 155 330 241Z', fill: '#49765e', opacity: .45 }),
        h('g', { transform: 'translate(52 47) rotate(-15 75 106)' }, h('rect', { width: 142, height: 199, rx: 13, fill: '#456959', stroke: '#8eaa7d' }), h('rect', { x: 9, y: 9, width: 124, height: 181, rx: 8, fill: 'none', stroke: '#9db98a', opacity: .6 }), h('path', { d: 'm71 53 12 34 33 13-33 13-12 34-12-34-33-13 33-13Z', fill: 'none', stroke: '#b4c69a', strokeWidth: 2 })),
        h('g', { transform: 'translate(133 35) rotate(12 77 110)' }, h('rect', { width: 153, height: 218, rx: 13, fill: 'url(#gw-art-card)', stroke: '#dbc389', strokeWidth: 2 }), h('rect', { x: 9, y: 9, width: 135, height: 200, rx: 9, fill: 'none', stroke: '#7d9873', opacity: .6 }), h('circle', { cx: 77, cy: 92, r: 49, fill: '#9eb994', opacity: .4 }), h('path', { d: 'm43 100-8-36 25 17 17-16 18 16 25-17-9 36-6 32-28 18-28-18Z', fill: '#2a6557' }), h('path', { d: 'm48 99 16 5-11 10m53-15-16 5 11 10M68 126l9 7 9-7', fill: 'none', stroke: '#e6d597', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('path', { d: 'M77 54v17m-7-8h14M48 171h58M61 184h32', stroke: '#748d68', strokeWidth: 2, strokeLinecap: 'round' }), h('circle', { cx: 77, cy: 91, r: 4, fill: '#e6d597' })),
        h('path', { d: 'm293 53 3 9 9 3-9 3-3 9-3-9-9-3 9-3ZM38 145l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z', fill: '#d9c48a' }));
    }
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const { meta: _zh, ...zhUi } = zh;
        const { meta: _en, ...enUi } = en;
        ctx.effect(() => ctx.locale.register('game-workshop', { zh: zhUi, en: enUi }), 'game-workshop locale');
        const t = ctx.locale.bind('game-workshop');
        const subscribe = listener => ctx.locale.subscribe(listener);
        const getSnapshot = () => ctx.locale.getSnapshot();
        function Workshop() {
          const snapshot = React.useSyncExternalStore(subscribe, getSnapshot);
          const language = snapshot.active === 'zh' ? 'zh' : 'en';
          const [playing, setPlaying] = React.useState(false);
          const [prompt, setPrompt] = React.useState(PROMPT);
          const [copyState, setCopyState] = React.useState('');
          const downloadRef = React.useRef(null);
          const html = React.useMemo(() => renderGame({ language }), [language]);
          const [downloadUrl, setDownloadUrl] = React.useState('');
          React.useEffect(() => {
            const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
            setDownloadUrl(url);
            return () => URL.revokeObjectURL(url);
          }, [html]);
          async function copyPrompt() {
            try { await navigator.clipboard.writeText(prompt); setCopyState('copied'); }
            catch { setCopyState('copyFailed'); }
          }
          const download = (hero = false) => h('a', { ref: downloadRef, className: `gw-btn${hero ? ' gw-btn-hero' : ''}`, href: downloadUrl || undefined, download: language === 'zh' ? '雾岭灵契.html' : 'Mistbound-Pacts.html', 'data-testid': 'download-game' }, t('download'));
          return h('main', { className: 'gw-page', 'data-testid': 'game-workshop-page' },
            h('style', null, STYLE),
            h('div', { className: 'gw-wrap' },
              h('header', { className: 'gw-heading' }, h('div', null, h('div', { className: 'gw-eyebrow' }, t('eyebrow')), h('h1', null, t('heading')), !playing && h('p', { className: 'gw-muted' }, t('intro'))), h('span', { className: 'gw-version' }, 'v0.1.0')),
              playing ? h('section', { 'aria-label': t('gameTitle') },
                h('div', { className: 'gw-gamebar' }, h('h2', null, t('sampleTitle')), h('div', { className: 'gw-actions' }, download(), h('button', { className: 'gw-btn', onClick: () => setPlaying(false) }, t('closeGame')))),
                h('iframe', { className: 'gw-game', title: t('gameTitle'), srcDoc: html, sandbox: 'allow-scripts allow-same-origin allow-downloads', 'data-testid': 'game-frame' }),
                h('p', { className: 'gw-game-note' }, t('gameHelp')))
                : h('section', { className: 'gw-hero', 'aria-label': t('sampleTitle') }, h('div', null,
                  h('span', { className: 'gw-sample-label' }, t('sampleLabel')), h('h2', null, t('sampleTitle')), h('p', null, t('sampleDescription')),
                  h('div', { className: 'gw-actions' }, h('button', { className: 'gw-btn gw-btn-primary', onClick: () => setPlaying(true), 'data-testid': 'start-game' }, h(Icon, {}), t('start')), download(true)),
                  h('div', { className: 'gw-features' }, ...['six', 'merge', 'stages'].map(key => h('span', { key }, h('i', { className: 'gw-dot', 'aria-hidden': true }), t(key))))), h(Art, { label: t('previewAlt') })),
              h('section', { className: 'gw-section' }, h('h2', null, t('createTitle')), h('p', { className: 'gw-muted' }, t('createDescription')),
                h('label', { htmlFor: 'gw-creation-prompt', className: 'gw-visually-hidden' }, t('promptLabel')),
                h('textarea', { id: 'gw-creation-prompt', className: 'gw-prompt', value: prompt, maxLength: 6000, onChange: event => { setPrompt(event.target.value); setCopyState(''); }, spellCheck: false, 'data-testid': 'creation-prompt' }),
                h('div', { className: 'gw-actions' }, h('button', { className: 'gw-btn', onClick: copyPrompt, 'data-testid': 'copy-prompt' }, t('copy')), h('span', { className: 'gw-copy-status', role: 'status' }, copyState ? t(copyState) : ''))),
              h('section', { className: 'gw-section' }, h('h2', null, t('editorsTitle')), h('p', { className: 'gw-muted' }, t('editorsDescription')),
                h('div', { className: 'gw-editors' }, ...['unity', 'unreal', 'blender'].map(editor => h('article', { key: editor, className: 'gw-editor' }, h('strong', null, t(editor)), h('small', null, t(editor === 'unreal' ? 'http' : 'stdio')), h('span', { className: 'gw-off' }, t('disabled'))))),
                h('p', { className: 'gw-safety' }, t('editorSafety'))),
              h('footer', { className: 'gw-footer' }, h('span', null, t('footer')), h('a', { className: 'gw-link', href: 'https://github.com/a348579184/dsh-game-workshop#readme', target: '_blank', rel: 'noopener noreferrer' }, t('docs')))));
        }
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'game-workshop', locale: 'game-workshop' }, Workshop));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'game-workshop', order: 25, locale: 'game-workshop', label: () => t('panel') }, Icon));
      },
    };
  },
});
