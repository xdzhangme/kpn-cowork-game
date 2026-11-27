// "How to start" pane, following the approved KPN landing page's getting-started pane:
// hero with a mock Cowork run, Cowork vs Chat comparison, five steps, "Extend Cowork" capability
// cards with copyable examples, a guide to this library, and the recurring-workflow checklist.
// The folder/orbit animations of the reference are replaced by plain lists (see docs/PRD.md).
import { onLangChange } from './i18n.js';
import { el, rich, svg, tr } from './doc-i18n.js';

const CHECK = svg('<path d="M5 12.5l4 4L19 7"/>', 16);
const VS_ROWS = ['is', 'speed', 'scope', 'use'];
const STEPS = ['describe', 'watch', 'steer', 'approve', 'review'];
const EXT = ['skill', 'plugin', 'connector', 'mcp', 'automation'];
const LIB_TOPICS = [
  { n: 1, tab: 'tab-game' }, { n: 2, tab: 'tab-library' }, { n: 3, tab: 'tab-library' },
  { n: 4, tab: 'tab-library' }, { n: 5, tab: 'tab-library' }, { n: 6, tab: 'tab-rai' },
];
const REC = [1, 2, 3, 4, 5];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function buildMockRun() {
  const steps = [1, 2, 3].map((n) => el('li', { 'data-step': String(n) }, el('span', { class: 'run-ic', html: CHECK }), el('span', { text: tr(`start.mock.s${n}`) })));
  const approve = el('button', { type: 'button', id: 'run-btn', class: 'run-btn', text: tr('start.mock.approve') });
  const status = el('p', { class: 'vh', id: 'run-status', 'aria-live': 'polite' });
  const replay = el('button', { type: 'button', class: 'btn secondary small run-replay', text: tr('start.mock.replay') });
  const run = el('div', { class: 'run', id: 'run' },
    el('div', { class: 'run-head' }, el('strong', { text: tr('start.mock.title') })),
    el('p', { class: 'run-prompt', text: tr('start.mock.prompt') }),
    el('ul', { class: 'run-steps' }, ...steps),
    el('div', { class: 'run-actions' }, approve, replay),
    status);
  let stage = 0;
  let timers = [];
  const paint = () => {
    steps.forEach((li, i) => {
      const n = i + 1;
      li.classList.toggle('is-done', n === 3 ? stage === 3 : stage >= n);
      li.classList.toggle('is-ask', n === 3 && stage === 2);
    });
    approve.hidden = stage !== 2;
    replay.hidden = stage !== 3;
    status.textContent = stage === 3 ? tr('start.mock.done') : stage === 2 ? tr('start.mock.s3') : '';
  };
  const start = () => {
    timers.forEach(clearTimeout);
    timers = [];
    stage = 0;
    paint();
    const d = reducedMotion.matches ? 0 : 1;
    timers.push(setTimeout(() => { stage = 1; paint(); }, 700 * d));
    timers.push(setTimeout(() => { stage = 2; paint(); }, 1500 * d));
  };
  approve.addEventListener('click', () => { stage = 3; paint(); });
  replay.addEventListener('click', start);
  paint();
  let started = false;
  new IntersectionObserver((entries) => {
    if (started || !entries.some((e) => e.isIntersecting)) return;
    started = true;
    start();
  }, { threshold: 0.6 }).observe(run);
  return run;
}

function buildVs() {
  const list = el('dl', { class: 'gs-compare', id: 'vs-list' });
  const seg = el('div', { class: 'gs-seg', id: 'vs-seg', role: 'radiogroup', 'aria-label': tr('start.vs.label'), 'data-value': 'cowork' },
    el('span', { class: 'thumb', 'aria-hidden': 'true' }),
    el('button', { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-v': 'chat', text: tr('start.vs.chat') }),
    el('button', { type: 'button', role: 'radio', 'aria-checked': 'true', 'data-v': 'cowork', text: tr('start.vs.cowork') }));
  const set = (v) => {
    seg.dataset.value = v;
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === v)));
    list.classList.toggle('swap', !reducedMotion.matches);
    list.replaceChildren(...VS_ROWS.flatMap((r) => [el('dt', { text: tr(`start.vs.row.${r}`) }), el('dd', { text: tr(`start.vs.${v}.${r}`) })]));
    setTimeout(() => list.classList.remove('swap'), 300);
  };
  seg.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set(b.dataset.v); });
  set('cowork');
  return el('section', { class: 'gs-sec gs-vs', 'aria-labelledby': 'vs-title' }, el('h3', { id: 'vs-title', text: tr('start.vs.title') }), seg, list);
}

function buildSteps() {
  const ol = el('ol', { class: 'gs-steps', id: 'gs-steps' }, ...STEPS.map((s) => el('li', {}, rich(tr(`start.step.${s}`)))));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-on', e.isIntersecting)), { threshold: 0.5 });
  [...ol.children].forEach((li) => io.observe(li));
  return el('section', { class: 'gs-sec', 'aria-labelledby': 'use-title' },
    el('h3', { id: 'use-title', text: tr('start.use.title') }), el('p', {}, rich(tr('start.use.intro'))), ol);
}

function buildExtend() {
  const cards = EXT.map((k) => {
    const name = tr(`start.ext.${k}.n`);
    const panel = el('div', { class: 'example-panel', hidden: true });
    const toggle = el('button', { type: 'button', class: 'example-toggle', 'aria-expanded': 'false', 'aria-label': tr('start.ext.example.viewLabel', { capability: name }), text: tr('start.ext.example.view') });
    const pre = el('pre', { 'aria-label': tr('start.ext.example.textLabel', { capability: name }), text: tr(`start.ext.${k}.example`) });
    const copy = el('button', { type: 'button', class: 'copy-button', 'aria-label': tr('start.ext.copyLabel', { capability: name }), text: tr('start.ext.copy') });
    const statusP = el('p', { class: 'copy-status small', 'aria-live': 'polite' });
    copy.addEventListener('click', async () => {
      if (!navigator.clipboard) { statusP.textContent = tr('start.ext.copy.unavailable'); return; }
      try {
        await navigator.clipboard.writeText(pre.textContent);
        statusP.textContent = tr('start.ext.copy.success');
      } catch (err) {
        statusP.textContent = err?.name === 'NotAllowedError' ? tr('start.ext.copy.denied') : tr('start.ext.copy.failed', { message: err?.message ?? '' });
      }
    });
    toggle.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = tr(open ? 'start.ext.example.hide' : 'start.ext.example.view');
      toggle.setAttribute('aria-label', tr(open ? 'start.ext.example.hideLabel' : 'start.ext.example.viewLabel', { capability: name }));
    });
    panel.append(el('div', { class: 'example-content' }, el('p', { class: 'example-note small', text: tr('start.ext.example.note') }), pre, copy, statusP));
    return el('article', { class: 'capability' },
      el('span', { class: 'cap-kind', text: tr(`start.ext.${k}.kind`) }), el('h4', { text: name }),
      el('p', { class: 'description' }, rich(tr(`start.ext.${k}.d`))), toggle, panel);
  });
  return el('section', { class: 'gs-sec gs-enhanced', 'aria-labelledby': 'ext-title' },
    el('h3', { id: 'ext-title', text: tr('start.ext.title') }), el('div', { class: 'capabilities', id: 'gs-blocks' }, ...cards));
}

function buildLibraryGuide() {
  const items = LIB_TOPICS.map(({ n, tab }) => {
    const link = el('a', { href: `#${tab}`, class: 'folder-open-link', text: tr('start.lib.open', { topic: tr(`start.lib.${n}.t`) }) });
    link.addEventListener('click', (e) => { e.preventDefault(); document.getElementById(tab)?.click(); window.scrollTo({ top: 0 }); });
    return el('li', {}, el('h4', {}, el('small', { text: String(n).padStart(2, '0') }), ' ', tr(`start.lib.${n}.t`)),
      el('p', { class: 'journey-summary', text: tr(`start.lib.${n}.d`) }),
      el('p', { text: tr(`start.lib.${n}.detail`) }),
      el('ul', { class: 'journey-notes' }, ...tr(`start.lib.${n}.checks`).split('|').map((c) => el('li', { text: c }))),
      link);
  });
  return el('section', { class: 'gs-sec gs-library', 'aria-labelledby': 'lib-guide-title' },
    el('h3', { id: 'lib-guide-title', text: tr('start.lib.title') }),
    el('p', { class: 'gs-langnote small', text: `${tr('start.lib.note')} ${tr('start.lib.lang')}` }),
    el('ol', { class: 'journey-list' }, ...items));
}

function buildRecurring() {
  const items = REC.map((n) => el('li', {},
    el('h4', {}, el('span', { class: 'rec-label', text: tr(`rec.${n}.label`) }), ' ', tr(`rec.${n}.t`)),
    el('p', { text: tr(`rec.${n}.d`) }),
    el('ul', { class: 'requirements' }, ...tr(`rec.${n}.checks`).split('|').map((c) => el('li', { text: c })))));
  return el('section', { class: 'gs-sec gs-rec', 'aria-labelledby': 'rec-title' },
    el('h3', { id: 'rec-title', text: tr('rec.title') }), el('p', { class: 'gs-lead', text: tr('rec.lead') }),
    el('p', { class: 'small', text: `${tr('rec.center')} ${tr('rec.center.note')}` }),
    el('ol', { class: 'rec-list' }, ...items));
}

export function initStartPane(root) {
  const render = () => {
    root.replaceChildren(
      el('div', { class: 'pane gs kpn-doc' },
        el('header', { class: 'gs-hero' },
          el('div', { class: 'gs-hero-text' }, el('h2', { text: tr('start.title') }), el('p', { class: 'gs-lead', text: tr('start.lead') })),
          el('div', { class: 'gs-hero-run' }, buildMockRun(), el('p', { class: 'run-note small', text: tr('start.mock.note') }))),
        buildVs(), buildSteps(), buildExtend(), buildLibraryGuide(), buildRecurring()));
  };
  render();
  onLangChange(render);
}
