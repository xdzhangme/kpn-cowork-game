// Bottom pixel button bar (Today's tasks, Map, How to play, Menu) and the dialogs they open.
import { getLang, LANGS, onLangChange, pick, setLang, t } from './i18n.js';
import { blocked } from './player.js';
import { completedIds, onProgressChange, progressCounts, resetProgress } from './progress.js';
import { roomDept } from './rooms.js';
import { OPEN_USE_CASE } from './rules.js';
import { setSoundEnabled, soundEnabled } from './sound.js';
import { drawMap, mapSize } from './tilemap.js';

const DEPT_KEY = 'department';
const TUTORIAL_KEY = 'tutorial-seen';
const TUTORIAL_STEPS = 6;
// Dispatch this on window (e.g. from the header Guide button) to open the How to play guide.
export const OPEN_GUIDE = 'open-guide';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, className, onClick) {
  const b = el('button', `px-btn ${className ?? ''}`.trim(), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function store(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the choice just won't persist.
  }
}

function load(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function roomLabel(room) {
  const key = `room.${room.id}`;
  const label = t(key);
  return label === key ? room.name : label;
}

// Short name drawn inside the room on the minimap; falls back to the full label.
function roomShortLabel(room) {
  const key = `room.short.${room.id}`;
  const label = t(key);
  return label === key ? roomLabel(room) : label;
}

// Draws every room's short name centred in its rectangle on the overview canvas. `scale` is the canvas
// pixels per map pixel; the label font stays at screen size so it is readable however small the map is drawn.
// Labels wider than the room are truncated with an ellipsis.
export function drawRoomLabels(ctx, map, rooms, { ink, panel, scale = 1 }) {
  const ts = map.tileSize * scale;
  ctx.save();
  ctx.font = '12px "Jersey 10", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  for (const room of rooms) {
    const maxW = room.w * ts - 6;
    let text = roomShortLabel(room);
    while (text.length > 1 && ctx.measureText(text).width > maxW) text = `${text.replace(/…$/, '').slice(0, -1)}…`;
    const tw = Math.ceil(ctx.measureText(text).width);
    const cx = Math.round((room.x + room.w / 2) * ts);
    const cy = Math.round((room.y + room.h / 2) * ts);
    ctx.fillStyle = ink;
    ctx.fillRect(cx - Math.ceil(tw / 2) - 3, cy - 8, tw + 6, 16);
    ctx.fillStyle = panel;
    ctx.fillText(text, cx, cy + 1);
  }
  ctx.restore();
}

function bar(done, total) {
  const wrap = el('div', 'px-bar');
  wrap.setAttribute('role', 'progressbar');
  wrap.setAttribute('aria-valuemin', '0');
  wrap.setAttribute('aria-valuemax', String(total));
  wrap.setAttribute('aria-valuenow', String(done));
  const segments = 20;
  const filled = total ? Math.round((done / total) * segments) : 0;
  for (let i = 0; i < segments; i++) wrap.append(el('i', i < filled ? 'f' : ''));
  return wrap;
}

export function initButtons({ container, map, useCases, player, mapView }) {
  const rooms = map.rooms ?? [];
  const deptRooms = rooms.filter((r) => r.type === 'department');
  const dialogs = {};

  function makeDialog(id, titleKey) {
    const dlg = el('dialog', 'px-dialog px-panel');
    dlg.id = `dialog-${id}`;
    const head = el('header', 'px-dialog-head px-title');
    const title = el('h2', 'px-dialog-title');
    title.dataset.i18n = titleKey;
    const close = button('', 'px-dialog-x', () => dlg.close());
    close.dataset.i18nAria = 'dialog.close';
    close.textContent = '×';
    head.append(title, close);
    const body = el('div', 'px-dialog-body');
    dlg.append(head, body);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close();
    });
    document.body.append(dlg);
    dialogs[id] = { dlg, body };
    return dialogs[id];
  }

  const open = (id) => {
    Object.values(dialogs).forEach((d) => d.dlg.open && d.dlg.close());
    refresh(id);
    dialogs[id].dlg.showModal();
  };

  // ---- Today's tasks ----
  function tasksBody(body) {
    const dept = load(DEPT_KEY);
    const done = new Set(completedIds());
    const mine = deptRooms.find((r) => r.id === dept);
    const intro = useCases.filter((u) => u.meta.department === 'intro');
    const required = useCases.filter((u) => u.meta.department === 'general' || (mine && u.meta.department === mine.id));
    const count = (list) => list.filter((u) => done.has(u.id)).length;

    const label = el('label', 'px-field', t('tasks.department'));
    const select = el('select', 'px-select');
    select.append(new Option(t('tasks.department.none'), ''));
    deptRooms.forEach((r) => select.append(new Option(roomLabel(r), r.id)));
    select.value = mine?.id ?? '';
    select.addEventListener('change', () => {
      store(DEPT_KEY, select.value || 'none');
      refresh('tasks');
    });
    label.append(select);
    body.append(label);

    const section = (titleKey, list, doneCount) => {
      body.append(el('h3', 'px-h', `${t(titleKey)} (${doneCount}/${list.length})`), bar(doneCount, list.length));
      if (!list.length) return body.append(el('p', 'placeholder', t('tasks.none')));
      const ul = el('ul', 'px-tasks');
      list.forEach((u) => {
        const li = el('li', done.has(u.id) ? 'is-done' : '');
        li.append(el('span', 'px-check', done.has(u.id) ? '✓' : ''), el('span', '', pick(u.title)));
        const room = rooms.find((r) => roomDept(r) === u.meta.department);
        if (room) li.append(button(t('map.jump'), 'px-btn--small', () => jumpTo(room)));
        ul.append(li);
      });
      body.append(ul);
    };
    if (intro.length) section('tasks.intro', intro, count(intro));
    section('tasks.required', required, count(required));
    body.append(el('p', 'placeholder', t('tasks.required.hint')));
  }

  // ---- Map ----
  function jumpTo(room) {
    const ts = map.tileSize;
    const cx = Math.floor(room.x + room.w / 2);
    const cy = Math.floor(room.y + room.h / 2);
    let spot = null;
    // Nearest tile to the room center whose feet box is free (props and walls excluded).
    for (let r = 0; r < Math.max(room.w, room.h) && !spot; r++) {
      for (let dy = -r; dy <= r && !spot; dy++) {
        for (let dx = -r; dx <= r && !spot; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = (cx + dx + 0.5) * ts;
          const y = (cy + dy + 1) * ts - 1;
          if (!blocked(map, x, y)) spot = { x, y };
        }
      }
    }
    if (spot) {
      player.x = spot.x;
      player.y = spot.y;
      mapView.setTarget(player.x, player.y - 8);
    }
    Object.values(dialogs).forEach((d) => d.dlg.open && d.dlg.close());
  }

  function mapBody(body) {
    const size = mapSize(map);
    // Render the map once at 1x, then fit the whole floor plan into the dialog so every room is visible
    // at a glance; labels and the player marker are drawn on top at screen size so they stay crisp.
    const full = document.createElement('canvas');
    full.width = size.width;
    full.height = size.height;
    drawMap(full.getContext('2d'), map, { x: 0, y: 0 }, size);
    const availW = Math.min(1040, window.innerWidth * 0.94) - 2 * 16 - 6 - 200 - 16 - 6;
    const availH = window.innerHeight * 0.7;
    const scale = Math.min(availW / size.width, availH / size.height, 2);
    const canvas = el('canvas', 'px-overview');
    canvas.width = Math.round(size.width * scale);
    canvas.height = Math.round(size.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = scale >= 1 ? false : true;
    ctx.drawImage(full, 0, 0, canvas.width, canvas.height);
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--ink').trim();
    const panel = css.getPropertyValue('--panel').trim();
    drawRoomLabels(ctx, map, rooms, { ink, panel, scale });
    const px = Math.round(player.x * scale);
    const py = Math.round((player.y - 4) * scale);
    ctx.fillStyle = css.getPropertyValue('--marker').trim();
    ctx.fillRect(px - 5, py - 5, 10, 10);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 5, py - 5, 10, 10);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('map.overview'));
    // Clicking a room on the minimap jumps there too.
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const tx = ((e.clientX - rect.left) / rect.width) * size.width / map.tileSize;
      const ty = ((e.clientY - rect.top) / rect.height) * size.height / map.tileSize;
      const room = rooms.find((r) => tx >= r.x - 1 && tx < r.x + r.w + 1 && ty >= r.y - 2 && ty < r.y + r.h + 1);
      if (room) jumpTo(room);
    });
    const wrap = el('div', 'px-overview-wrap');
    wrap.append(canvas);
    const list = el('ul', 'px-rooms');
    rooms.forEach((room) => {
      const li = el('li');
      const b = button(roomLabel(room), 'px-btn--room', () => jumpTo(room));
      li.append(b);
      list.append(li);
    });
    const side = el('div', 'px-map-side');
    side.append(el('h3', 'px-h', t('map.rooms')), list);
    const layout = el('div', 'px-map-layout');
    layout.append(wrap, side);
    body.append(el('p', 'placeholder', t('map.hint')), layout);
  }

  // ---- How to play guide ----
  let step = 0;
  function tutorialBody(body) {
    const dots = el('ol', 'px-steps');
    for (let i = 0; i < TUTORIAL_STEPS; i++) {
      const li = el('li', i === step ? 'is-current' : i < step ? 'is-done' : '', String(i + 1));
      li.setAttribute('aria-current', i === step ? 'step' : 'false');
      dots.append(li);
    }
    body.append(
      el('p', 'px-step-count', `${step + 1} / ${TUTORIAL_STEPS}`),
      dots,
      el('h3', 'px-h', t(`tutorial.${step}.title`)),
      el('p', '', t(`tutorial.${step}.text`)),
      el('p', 'px-tip', t(`tutorial.${step}.tip`)),
    );
    const last = step === TUTORIAL_STEPS - 1;
    if (last) body.append(el('p', 'px-muted', t('tutorial.reopen')));
    const foot = el('div', 'px-dialog-foot');
    const back = button(t('tutorial.back'), '', () => {
      step -= 1;
      refresh('tutorial');
    });
    back.disabled = step === 0;
    const next = button(last ? t('tutorial.done') : t('tutorial.next'), 'px-btn--primary', () => {
      if (last) dialogs.tutorial.dlg.close();
      else {
        step += 1;
        refresh('tutorial');
      }
    });
    next.id = 'tutorial-next';
    foot.append(back, next);
    body.append(foot);
  }

  // ---- Menu ----
  function menuBody(body) {
    const langRow = el('div', 'px-row');
    langRow.append(el('span', 'px-h', t('menu.language')));
    const langs = el('div', 'px-seg');
    LANGS.forEach((l) => {
      const b = button(l.toUpperCase(), getLang() === l ? 'px-btn--primary' : '', () => setLang(l));
      b.setAttribute('aria-pressed', String(getLang() === l));
      langs.append(b);
    });
    langRow.append(langs);

    const soundRow = el('div', 'px-row');
    soundRow.append(el('span', 'px-h', t('menu.sound')));
    const sound = button(soundEnabled() ? t('menu.on') : t('menu.off'), soundEnabled() ? 'px-btn--primary' : '', () => {
      setSoundEnabled(!soundEnabled());
      refresh('menu');
    });
    sound.setAttribute('aria-pressed', String(soundEnabled()));
    soundRow.append(sound);

    const resetRow = el('div', 'px-row');
    resetRow.append(el('span', 'px-h', t('menu.reset')), button(t('menu.reset.button'), '', () => open('reset')));
    body.append(langRow, soundRow, resetRow);
  }

  function resetBody(body) {
    body.append(el('p', '', t('reset.confirm')));
    const foot = el('div', 'px-dialog-foot');
    foot.append(
      button(t('reset.cancel'), '', () => open('menu')),
      button(t('reset.ok'), 'px-btn--primary', () => {
        resetProgress();
        dialogs.reset.dlg.close();
      }),
    );
    body.append(foot);
  }

  const builders = { tasks: tasksBody, map: mapBody, tutorial: tutorialBody, menu: menuBody, reset: resetBody };
  const titles = { tasks: 'bar.tasks', map: 'bar.map', tutorial: 'bar.tutorial', menu: 'bar.menu', reset: 'reset.title' };
  Object.entries(titles).forEach(([id, key]) => makeDialog(id, key));
  dialogs.map.dlg.classList.add('px-dialog--map');

  function refresh(id) {
    const d = dialogs[id];
    d.body.replaceChildren();
    builders[id](d.body);
    d.dlg.querySelectorAll('[data-i18n]').forEach((n) => (n.textContent = t(n.dataset.i18n)));
    d.dlg.querySelectorAll('[data-i18n-aria]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.i18nAria)));
  }

  const refreshOpen = () => Object.keys(dialogs).forEach((id) => dialogs[id].dlg.open && refresh(id));
  onLangChange(refreshOpen);
  onProgressChange(refreshOpen);
  window.addEventListener(OPEN_USE_CASE, () => Object.values(dialogs).forEach((d) => d.dlg.open && d.dlg.close()));
  const openGuide = () => {
    step = 0;
    document.querySelectorAll('dialog[open]').forEach((d) => d !== dialogs.tutorial.dlg && d.close());
    open('tutorial');
  };
  window.addEventListener(OPEN_GUIDE, openGuide);

  // ---- Bar ----
  const items = [
    ['tasks', 'bar.tasks', () => open('tasks')],
    ['map', 'bar.map', () => open('map')],
    ['tutorial', 'bar.tutorial', openGuide],
    ['menu', 'bar.menu', () => open('menu')],
  ];
  container.replaceChildren();
  items.forEach(([id, key, handler]) => {
    const b = el('button', 'px-btn px-bar-btn');
    b.type = 'button';
    b.id = `bar-${id}`;
    b.dataset.i18n = key;
    b.textContent = t(key);
    b.addEventListener('click', handler);
    container.append(b);
  });
  const summary = el('span', 'px-bar-summary');
  container.append(summary);
  const updateSummary = () => {
    const c = progressCounts(useCases.filter((u) => u.meta.department !== 'intro'));
    summary.textContent = `${c.completed} / ${c.total} ${t('panel.completed')}`;
  };
  onProgressChange(updateSummary);
  onLangChange(updateSummary);
  updateSummary();

  // First run: show the How to play guide once, after the department picker.
  if (!load(TUTORIAL_KEY)) {
    store(TUTORIAL_KEY, '1');
    step = 0;
    const picker = document.getElementById('department-dialog');
    if (picker?.open) picker.addEventListener('close', () => open('tutorial'), { once: true });
    else open('tutorial');
  }
}
