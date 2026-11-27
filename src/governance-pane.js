// "Responsible AI" pane, following the approved KPN landing page's governance pane:
// grouped tiles (Data, Oversight, Region and cost, Limits), tenant-setting chips and a banner.
import { onLangChange } from './i18n.js';
import { el, svg, tr } from './doc-i18n.js';

const GROUPS = [
  ['data', ['inside', 'rights', 'labels', 'training']],
  ['oversight', ['trace', 'approve', 'ext']],
  ['region', ['eu', 'cost']],
  ['limits', ['gaps']],
];
// Tenant settings shown as chips; both are off until an admin enables them.
const CHIPS = { eu: ['claude', 'off'], approve: ['browser', 'off'] };
const WARNING = svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18.5v.5"/>', 28);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Hover / focus effect from the reference page: the tile tilts towards the pointer and lifts,
// while a grid of small brand-coloured pixels fades in from the pointer position on a canvas.
function attachTileEffect(tile) {
  const canvas = el('canvas', { class: 'gv-pixels', 'aria-hidden': 'true' });
  const context = canvas.getContext('2d');
  if (!context) return;
  tile.prepend(canvas);
  const state = { width: 0, height: 0, pixels: [], hovered: false, focused: false, active: false, start: 0, age: 0, originX: 0, originY: 0 };
  let frame = 0;
  // Layout coordinates stay stable while the tile's visual bounds rotate.
  const pointer = (event) => {
    const grid = tile.parentElement.getBoundingClientRect();
    return { x: event.clientX - grid.left - tile.offsetLeft, y: event.clientY - grid.top - tile.offsetTop };
  };
  const resetTilt = () => {
    tile.classList.remove('is-tilting');
    tile.style.removeProperty('--tilt-x');
    tile.style.removeProperty('--tilt-y');
  };
  const moveTilt = (event) => {
    if (!state.hovered || reducedMotion.matches || event.pointerType === 'touch' || !tile.offsetWidth) return;
    const point = pointer(event);
    const h = Math.max(-1, Math.min(1, (point.x / tile.offsetWidth) * 2 - 1));
    const v = Math.max(-1, Math.min(1, (point.y / tile.offsetHeight) * 2 - 1));
    tile.style.setProperty('--tilt-x', `${(-v * 5).toFixed(2)}deg`);
    tile.style.setProperty('--tilt-y', `${(h * 5).toFixed(2)}deg`);
    tile.style.setProperty('--x', `${point.x}px`);
    tile.style.setProperty('--y', `${point.y}px`);
    tile.classList.add('is-tilting');
  };
  const draw = (now) => {
    frame = 0;
    const width = tile.offsetWidth;
    const height = tile.offsetHeight;
    if (!width || !height || document.hidden) { context.clearRect(0, 0, state.width, state.height); return; }
    if (width !== state.width || height !== state.height) {
      state.width = width;
      state.height = height;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      state.pixels = [];
      for (let y = 5; y < height; y += 9) {
        for (let x = 5; x < width; x += 9) {
          state.pixels.push({ x, y, size: 1.5 + Math.random() * 2, phase: Math.random() * Math.PI * 2, delay: Math.random() * 160 });
        }
      }
    }
    const elapsed = Math.max(0, now - state.start);
    const age = state.active ? Math.min(elapsed, 3000) : state.age;
    const fade = state.active ? 1 : Math.max(0, 1 - elapsed / 300);
    context.clearRect(0, 0, width, height);
    context.fillStyle = getComputedStyle(canvas).color;
    for (const p of state.pixels) {
      const delay = Math.hypot(p.x - state.originX, p.y - state.originY) * 0.7 + p.delay;
      const reveal = Math.min(1, Math.max(0, (age - delay) / 350));
      const size = p.size * reveal * fade;
      context.globalAlpha = (0.45 + 0.25 * Math.sin(age / 260 + p.phase)) * reveal * fade;
      context.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
    context.globalAlpha = 1;
    state.age = age;
    if (state.active ? elapsed < 3000 : fade > 0) frame = requestAnimationFrame(draw);
  };
  const update = (event) => {
    const active = state.hovered || state.focused;
    if (active === state.active) return;
    if (reducedMotion.matches) { state.active = false; resetTilt(); return; }
    state.active = active;
    state.start = performance.now();
    if (active) {
      const point = event.type === 'pointerenter' ? pointer(event) : { x: tile.offsetWidth / 2, y: tile.offsetHeight / 2 };
      state.originX = point.x;
      state.originY = point.y;
    }
    if (!frame) frame = requestAnimationFrame(draw);
  };
  tile.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    state.hovered = true;
    update(event);
    moveTilt(event);
  });
  tile.addEventListener('pointermove', moveTilt);
  for (const type of ['pointerleave', 'pointercancel']) {
    tile.addEventListener(type, (event) => { state.hovered = false; resetTilt(); update(event); });
  }
  tile.addEventListener('focusin', (event) => { state.focused = true; update(event); });
  tile.addEventListener('focusout', (event) => {
    if (tile.contains(event.relatedTarget)) return;
    state.focused = false;
    update(event);
  });
}

export function initGovernancePane(root) {
  const render = () => {
    const groups = GROUPS.map(([g, ids]) => el('section', { class: 'gv-group', 'data-group': g, 'aria-labelledby': `gv-g-${g}` },
      el('h3', { id: `gv-g-${g}`, text: tr(`gov.group.${g}`) }),
      el('div', { class: 'gv-grid' }, ...ids.map((id) => {
        const tile = el('article', { class: 'gv-tile', id: `gv-${id}` },
          el('h4', { text: tr(`gov.item.${id}.t`) }), el('p', { text: tr(`gov.item.${id}.b`) }));
        if (CHIPS[id]) {
          const [chip, state] = CHIPS[id];
          tile.append(el('div', { class: 'gv-chips' },
            el('span', { class: 'gv-chip', 'data-chip': chip, 'data-state': state }, el('span', { class: 'dot', 'aria-hidden': 'true' }), tr(`gov.chip.${chip}.${state}`))));
        }
        tile.tabIndex = 0;
        attachTileEffect(tile);
        return tile;
      }))));
    root.replaceChildren(
      el('div', { class: 'pane gv kpn-doc' },
        el('h2', { class: 'gv-title', text: tr('gov.title') }),
        el('p', { class: 'gv-lead', text: tr('gov.lead') }),
        el('div', { id: 'gv-groups' }, ...groups),
        el('aside', { class: 'gv-banner', role: 'note' },
          el('span', { class: 'gv-banner-ic', html: WARNING }),
          el('div', {}, el('h3', { text: tr('gov.banner.title') }), el('p', { text: tr('gov.banner.body') })))));
  };
  render();
  onLangChange(render);
}
