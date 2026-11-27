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

// Interactive folder (from the reference page): the folder front opens on click and the six
// guide pages fan out; hovering, focusing or clicking a page previews its guidance in the card.
function buildLibraryGuide() {
  const detail = el('div', { class: 'journey-detail', id: 'journey-detail', role: 'region', 'aria-live': 'polite', 'aria-label': tr('start.lib.selected') });
  const pages = el('div', { id: 'gs-guide' });
  pages.inert = true;
  const toggle = el('button', { type: 'button', class: 'folder-front', id: 'folder-toggle', 'aria-expanded': 'false', 'aria-controls': 'gs-guide' },
    el('strong', { text: tr('start.lib.folder.title') }), el('span', { text: tr('start.lib.folder.open') }));
  const stage = el('div', { class: 'folder-stage' }, el('div', { class: 'folder-back', 'aria-hidden': 'true' }), pages, toggle);
  let selected = -1;
  const openTab = (tab) => (e) => { e.preventDefault(); document.getElementById(tab)?.click(); window.scrollTo({ top: 0 }); };
  function select(index, animate = true) {
    if (index === selected) return;
    selected = index;
    const { n, tab } = LIB_TOPICS[index];
    pages.querySelectorAll('.folder-paper').forEach((paper, i) => (i === index ? paper.setAttribute('aria-current', 'true') : paper.removeAttribute('aria-current')));
    const link = el('a', { href: `#${tab}`, class: 'folder-open-link', text: tr('start.lib.open', { topic: tr(`start.lib.${n}.t`) }) });
    link.addEventListener('click', openTab(tab));
    detail.replaceChildren(
      el('h4', { text: tr(`start.lib.${n}.t`) }),
      el('p', { class: 'journey-summary', text: tr(`start.lib.${n}.d`) }),
      el('p', { text: tr(`start.lib.${n}.detail`) }),
      el('ul', { class: 'journey-notes' }, ...tr(`start.lib.${n}.checks`).split('|').map((c) => el('li', { text: c }))),
      link);
    detail.getAnimations().forEach((a) => a.cancel());
    if (animate && !reducedMotion.matches) detail.animate([{ opacity: 0.3, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 210, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  LIB_TOPICS.forEach(({ n, tab }, index) => {
    const paper = el('a', { href: `#${tab}`, class: 'folder-paper' }, el('small', { text: String(n).padStart(2, '0') }), el('span', { text: tr(`start.lib.${n}.t`) }));
    paper.style.setProperty('--rest-x', `${(index - 2.5) * 3}px`);
    paper.style.setProperty('--rest-r', `${(index - 2.5) * 2}deg`);
    paper.addEventListener('pointerenter', () => select(index));
    paper.addEventListener('focus', () => select(index));
    paper.addEventListener('click', (e) => { select(index); openTab(tab)(e); });
    pages.append(paper);
  });
  toggle.addEventListener('click', () => {
    const opening = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.querySelector('span').textContent = tr(opening ? 'start.lib.folder.close' : 'start.lib.folder.open');
    stage.classList.toggle('is-open', opening);
    pages.inert = !opening;
  });
  // Lays the pages out in 2 or 3 columns depending on the stage width (as in the reference).
  function position() {
    const width = stage.getBoundingClientRect().width;
    if (!width) return;
    const columns = width >= 330 ? 3 : 2;
    const paperWidth = Math.min(104, (width - 24 - (columns - 1) * 10) / columns);
    stage.style.height = columns === 3 ? '340px' : '440px';
    stage.style.setProperty('--rest-y', columns === 3 ? '160px' : '260px');
    stage.style.setProperty('--paper-width', `${paperWidth}px`);
    pages.querySelectorAll('.folder-paper').forEach((paper, index) => {
      paper.style.setProperty('--paper-x', `${((index % columns) - (columns - 1) / 2) * (paperWidth + 10)}px`);
      paper.style.setProperty('--paper-y', `${40 + Math.floor(index / columns) * 104}px`);
    });
  }
  select(0, false);
  new ResizeObserver(() => requestAnimationFrame(position)).observe(stage);
  return el('section', { class: 'gs-sec gs-enhanced gs-library', 'aria-labelledby': 'lib-guide-title' },
    el('h3', { id: 'lib-guide-title', text: tr('start.lib.title') }),
    el('p', { text: tr('start.lib.note') }),
    el('div', { class: 'library-guide' }, stage, detail),
    el('p', { class: 'journey-footnote', text: tr('start.lib.hint') }),
    el('p', { class: 'gs-langnote', text: tr('start.lib.lang') }));
}

// Lifecycle ring (from the reference page): five stages on an orbit, a marker dot that travels
// along the ring and a gooey highlight pill behind the active stage. Stages auto-advance every
// few seconds while the section is on screen until the reader picks one.
const ORBIT_R = 145 / 420 * 100; // ring radius as % of the orbit box
const GOO_FILTER = '<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs><filter id="workflow-goo" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/><feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter></defs></svg>';
function buildRecurring() {
  const content = el('div', { class: 'map-panel', id: 'lifecycle-content', role: 'region', 'aria-live': 'polite', 'aria-label': tr('rec.selected') });
  const marker = el('div', { class: 'orbit-marker' }, el('span'));
  const gooLayer = el('div', { class: 'gooey-layer', 'aria-hidden': 'true' });
  const pill = el('div', { class: 'gooey-pill' });
  gooLayer.append(pill);
  const topics = el('div', { id: 'orbit-topics', role: 'group', 'aria-label': tr('rec.choose') });
  // `el` creates HTML elements; the ring needs a real SVG element.
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  line.setAttribute('class', 'orbit-line');
  line.setAttribute('viewBox', '0 0 420 420');
  line.setAttribute('aria-hidden', 'true');
  line.innerHTML = '<circle cx="210" cy="210" r="145" fill="none" stroke="#d9dde3" stroke-width="1.5"/>';
  const orbit = el('div', { class: 'orbit' },
    line,
    el('div', { class: 'orbit-track', 'aria-hidden': 'true' }, marker),
    gooLayer,
    el('div', { class: 'orbit-center' }, el('strong', { text: tr('rec.center') }), el('span', { text: tr('rec.center.note') }), el('span', { class: 'compact-label', text: tr('rec.center.compact') })),
    topics);

  let active = -1;
  let angle = 36;
  let spin = null;
  let gooReady = false;
  const gooAnims = new Set();
  function clearGoo() {
    gooAnims.forEach((a) => a.cancel());
    gooAnims.clear();
    gooLayer.querySelectorAll('.gooey-drop').forEach((d) => d.remove());
  }
  function moveGoo(index, animate) {
    const bounds = orbit.getBoundingClientRect();
    if (!bounds.width) return;
    const node = topics.children[index]?.getBoundingClientRect();
    if (!node) return;
    const prev = pill.getBoundingClientRect();
    const end = { x: node.left - bounds.left + node.width / 2, y: node.top - bounds.top + node.height / 2, w: node.width + 12, h: node.height + 12 };
    const start = gooReady ? { x: prev.left - bounds.left + prev.width / 2, y: prev.top - bounds.top + prev.height / 2, w: prev.width, h: prev.height } : end;
    clearGoo();
    gooReady = true;
    pill.style.width = `${end.w}px`;
    pill.style.height = `${end.h}px`;
    pill.style.transform = `translate(${end.x - end.w / 2}px, ${end.y - end.h / 2}px)`;
    if (!animate || reducedMotion.matches || Math.hypot(end.x - start.x, end.y - start.y) < 1) return;
    const c = { x: bounds.width / 2, y: bounds.height / 2 };
    const a0 = Math.atan2(start.y - c.y, start.x - c.x);
    const a1 = Math.atan2(end.y - c.y, end.x - c.x);
    const delta = ((((a1 - a0 + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    const r0 = Math.hypot(start.x - c.x, start.y - c.y);
    const r1 = Math.hypot(end.x - c.x, end.y - c.y);
    const point = (t, spread = 0) => {
      const a = a0 + delta * t;
      const r = r0 + (r1 - r0) * t + spread * Math.sin(Math.PI * t);
      return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
    };
    const frames = Array.from({ length: 21 }, (_, step) => {
      const t = step / 20;
      const p = point(t);
      const w = start.w + (end.w - start.w) * t;
      const h = start.h + (end.h - start.h) * t;
      return { offset: t, width: `${w}px`, height: `${h}px`, transform: `translate(${p.x - w / 2}px, ${p.y - h / 2}px)` };
    });
    const pillAnim = pill.animate(frames, { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' });
    gooAnims.add(pillAnim);
    pillAnim.onfinish = () => gooAnims.delete(pillAnim);
    for (let i = 0; i < 6; i++) {
      const drop = el('span', { class: 'gooey-drop' });
      const size = 20 + (i % 3) * 4;
      drop.style.width = drop.style.height = `${size}px`;
      gooLayer.append(drop);
      const dropFrames = Array.from({ length: 21 }, (_, step) => {
        const t = step / 20;
        const p = point(t, (i % 2 ? -1 : 1) * (14 + i * 3));
        return { offset: t, transform: `translate(${p.x - size / 2}px, ${p.y - size / 2}px) scale(${0.6 + 0.65 * Math.sin(Math.PI * t)})`, opacity: step === 20 ? 0 : 1 };
      });
      const anim = drop.animate(dropFrames, { duration: 620 + i * 35, easing: 'cubic-bezier(.22,1,.36,1)' });
      gooAnims.add(anim);
      anim.onfinish = () => { gooAnims.delete(anim); drop.remove(); };
    }
  }
  function moveMarker(index, animate) {
    if (spin) {
      const m = new DOMMatrixReadOnly(getComputedStyle(marker).transform);
      angle = (Math.atan2(m.b, m.a) * 180) / Math.PI;
      spin.cancel();
      spin = null;
    }
    const target = index * 72 + 36;
    const delta = ((((target - angle + 180) % 360) + 360) % 360) - 180;
    const from = angle;
    angle += delta;
    marker.style.transform = `rotate(${angle}deg)`;
    if (animate && !reducedMotion.matches) {
      spin = marker.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${angle}deg)` }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      spin.onfinish = () => (spin = null);
    }
  }
  function select(index, animate = true) {
    if (index === active) return;
    active = index;
    const n = REC[index];
    [...topics.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    content.replaceChildren(
      el('h4', { text: tr(`rec.${n}.t`) }),
      el('p', { text: tr(`rec.${n}.d`) }),
      el('ul', { class: 'requirements' }, ...tr(`rec.${n}.checks`).split('|').map((c) => el('li', { text: c }))));
    content.getAnimations().forEach((a) => a.cancel());
    if (animate && !reducedMotion.matches) content.animate([{ opacity: 0.3, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 210, easing: 'cubic-bezier(.22,1,.36,1)' });
    moveMarker(index, animate);
    moveGoo(index, animate);
  }
  let autoplay = !reducedMotion.matches;
  REC.forEach((n, index) => {
    const a = (index * 2 * Math.PI) / 5;
    const b = el('button', { type: 'button', class: 'orbit-node', 'aria-controls': 'lifecycle-content', text: tr(`rec.${n}.label`) });
    b.style.setProperty('--x', `${50 + Math.sin(a) * ORBIT_R}%`);
    b.style.setProperty('--y', `${50 - Math.cos(a) * ORBIT_R}%`);
    b.addEventListener('click', () => { autoplay = false; select(index); });
    b.addEventListener('pointerenter', () => select(index));
    b.addEventListener('focus', () => select(index));
    topics.append(b);
  });
  const study = el('div', { class: 'content-panel map-study' },
    el('div', { class: 'map-visual' }, orbit, el('p', { class: 'map-note', text: tr('rec.selection.note') })),
    content);
  // Auto-advance only while the ring is on screen and the pointer is not over it.
  let hovering = false;
  let visible = false;
  study.addEventListener('pointerenter', () => (hovering = true));
  study.addEventListener('pointerleave', () => (hovering = false));
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible && gooReady) moveGoo(active, false);
  }, { threshold: 0.3 }).observe(study);
  const timer = setInterval(() => {
    if (!study.isConnected) { clearInterval(timer); return; }
    if (!autoplay || !visible || hovering) return;
    select((active + 1) % REC.length);
  }, 4500);
  new ResizeObserver(() => moveGoo(active, false)).observe(orbit);
  requestAnimationFrame(() => select(0, false));
  const section = el('section', { class: 'gs-sec gs-enhanced gs-rec', 'aria-labelledby': 'rec-title' },
    el('h3', { id: 'rec-title', text: tr('rec.title') }), el('p', { text: tr('rec.lead') }),
    el('div', { html: GOO_FILTER, 'aria-hidden': 'true' }),
    study);
  return section;
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
