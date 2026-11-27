// Generates src/data/office-map.json: the 15-room office (tiles, rooms, props, slots, objects, doors).
// Run with `npm run build:map`, then `npm run check:map`. The JSON is committed; edit this script to change the layout.
//
// Floor plan (tile coordinates, 40 x 61):
//   - a top band with four department rooms (Consumer, Business SME, Network & IT, Tailored Solutions)
//     opening onto the wide corridor H1;
//   - a central spine V1 running down from H1 to the reception, with branch corridors H2, H3 and H4 on the
//     left and H5 on the right; Finance, People & Learning and the big General room sit in the middle band,
//     Business LCE, Wholesale and the Chat vs Cowork room in the lower-middle band;
//   - the functional rooms (open workspace, cafeteria, lounge, print room and the reception where the
//     player spawns) are scattered along the bottom, so new players walk up through the office.
// Rooms are interior rectangles {x, y, w, h}; the generator wraps them in a wall band (top wall at y-2,
// tinted back-wall face at y-1, bottom wall at y+h, side walls at x-1 and x+w). Corridors are only drawn
// on void cells and every doorway is checked to open onto a corridor tile. Outer walls are added
// automatically around every floor tile that borders the void, which gives the irregular building outline.
import { writeFileSync } from 'node:fs';

const W = 40;
const H = 61;
const grid = Array.from({ length: H }, () => Array(W).fill(' '));
const props = [];
const slots = [];
const rooms = [];
const doors = [];
const doorCells = new Set();

const at = (x, y) => grid[y]?.[x];
const key = (x, y) => `${x},${y}`;
function set(x, y, ch) {
  if (x < 0 || y < 0 || x >= W || y >= H) throw new Error(`Out of map: ${x},${y}`);
  grid[y][x] = ch;
}

// ---- corridors ----
// Drawn first so rooms can share walls with them; a corridor cell must be void.
const CORRIDORS = [
  { id: 'H1', x0: 1, y0: 11, x1: 38, y1: 13 },
  { id: 'V1', x0: 22, y0: 14, x1: 24, y1: 50 },
  { id: 'H2', x0: 1, y0: 24, x1: 21, y1: 26 },
  { id: 'H3', x0: 1, y0: 36, x1: 21, y1: 38 },
  { id: 'H4', x0: 1, y0: 47, x1: 21, y1: 49 },
  { id: 'H5', x0: 25, y0: 41, x1: 37, y1: 43 },
];
for (const c of CORRIDORS) {
  for (let y = c.y0; y <= c.y1; y++) {
    for (let x = c.x0; x <= c.x1; x++) {
      if (at(x, y) !== ' ') throw new Error(`Corridor ${c.id} overlaps ${at(x, y)} at ${x},${y}`);
      set(x, y, '.');
    }
  }
}

// ---- props ----
const add = (sprite, x, y, w = 1, h = 1, extra = {}) => props.push({ sprite, x, y, w, h, ...extra });
const wallDecor = (sprite, x, y) => add(sprite, x, y, 1, 1, { solid: false });
const rug = (name, x, y, w, h) => add(name, x, y, w, h, { solid: false, layer: 'floor' });
const chair = (x, y) => add('chair', x, y, 1, 1, { solid: false, dx: 8 });

function desk(roomId, n, x, y) {
  const id = `${roomId}-${n}`;
  add('desk', x, y, 2, 1, { slot: id });
  chair(x, y + 1);
  slots.push({ id, room: roomId, x, y, prop: 'desk' });
}

// ---- rooms ----
// Walls '#', back-wall face 'F', floor '.', doorway 'D'. Walls may overlap existing walls; nothing else may.
function carve(def) {
  const { x, y, w, h } = def;
  for (let yy = y - 2; yy <= y + h; yy++) {
    for (let xx = x - 1; xx <= x + w; xx++) {
      const inner = xx >= x && xx <= x + w - 1 && yy >= y - 1 && yy <= y + h - 1;
      const cur = at(xx, yy);
      if (inner) {
        if (cur !== ' ') throw new Error(`Room ${def.id} overlaps ${cur} at ${xx},${yy}`);
        set(xx, yy, yy === y - 1 ? 'F' : '.');
      } else {
        if (cur !== ' ' && cur !== '#') throw new Error(`Wall of ${def.id} overlaps ${cur} at ${xx},${yy}`);
        set(xx, yy, '#');
      }
    }
  }
  rooms.push({ id: def.id, name: def.name, type: def.type, dept: def.dept ?? null, tint: def.tint, floor: def.floor, x, y, w, h });
  // wall sign plaque (2 tiles wide) near the right end of the back wall
  add(`sign-${def.sign ?? def.id}`, def.signX ?? x + w - 2, y - 1, 2, 1, { solid: false });
}

// Door tiles for a room: two tiles wide/tall, opening onto a corridor cell. Top doors cut through the wall
// and the back-wall face (two tiles deep). Returns the cells the player walks through inside the room
// (the "apron") that must stay free of furniture.
function door(def) {
  const { x, y, w, h } = def;
  const { side, at: a } = def.door;
  const tiles = [];
  const outside = [];
  const apron = [];
  if (side === 'left' || side === 'right') {
    const wx = side === 'left' ? x - 1 : x + w;
    const ox = side === 'left' ? wx - 1 : wx + 1;
    const ix = side === 'left' ? [x, x + 1] : [x + w - 2, x + w - 1];
    for (const dy of [0, 1]) {
      tiles.push([wx, y + a + dy]);
      outside.push([ox, y + a + dy]);
    }
    for (let dy = -1; dy <= 2; dy++) ix.forEach((cx) => apron.push([cx, y + a + dy]));
  } else if (side === 'bottom') {
    for (const dx of [0, 1]) {
      tiles.push([x + a + dx, y + h]);
      outside.push([x + a + dx, y + h + 1]);
      apron.push([x + a + dx, y + h - 1], [x + a + dx, y + h - 2]);
    }
  } else if (side === 'top') {
    for (const dx of [0, 1]) {
      tiles.push([x + a + dx, y - 2], [x + a + dx, y - 1]);
      outside.push([x + a + dx, y - 3]);
      apron.push([x + a + dx, y], [x + a + dx, y + 1]);
    }
  }
  for (const [ox, oy] of outside) {
    if (at(ox, oy) !== '.') throw new Error(`Door of ${def.id} at ${ox},${oy} does not open onto a corridor`);
  }
  for (const [tx, ty] of tiles) {
    set(tx, ty, 'D');
    doors.push({ x: tx, y: ty });
    doorCells.add(key(tx, ty));
  }
  return new Set(apron.map(([ax, ay]) => key(ax, ay)));
}

// ---- furniture catalogue ----
// Five desk positions per layout as [dx, dy] from the room's top-left floor tile (dy 0 = storage row).
const LAYOUTS = {
  rows: [[1, 3], [4, 3], [7, 3], [1, 6], [5, 6]],
  pods: [[1, 3], [4, 3], [1, 6], [4, 6], [7, 4]],
  stagger: [[1, 3], [4, 4], [7, 3], [2, 6], [6, 6]],
  benches: [[1, 3], [4, 3], [7, 3], [2, 5], [6, 5]],
  ring: [[1, 3], [1, 5], [7, 3], [7, 5], [4, 6]],
  scatter: [[2, 3], [5, 3], [1, 5], [4, 6], [7, 5]],
  // keeps the two leftmost columns free for a door on the left wall (needs w >= 10)
  rightpack: [[3, 3], [6, 3], [2, 5], [5, 5], [8, 5]],
  // keeps the two rightmost columns free for a door on the right wall (needs h >= 7)
  leftpack: [[1, 3], [4, 3], [1, 5], [4, 5], [6, 7]],
  solo: [[4, 4]],
};

// Per-room furniture sets. Entries: [sprite, dx, row, w]. Rows: 1 = back wall, 2 = storage row, 7 = sixth floor row.
// A negative dx counts from the right edge (-1 is the last column). Rug: [sprite, dx, w, h] at row 4.
// `items` are placed unless they hit a doorway or its apron; `extra` and MORE are best-effort fillers.
const DECOR = {
  finance: {
    layout: 'rows',
    items: [['window', 0, 1], ['chart', 2, 1, 2], ['clock', 7, 1], ['safe', 0, 2], ['cabinet', 2, 2], ['cabinet', 3, 2], ['plant', -1, 2], ['bin', -1, 7]],
    rug: ['rug-4x2', 3, 4, 2],
    extra: [['ledger', 8, 1], ['cabinet', 4, 2], ['plant', 0, 7], ['safe', 0, 6], ['cabinet', 0, 3], ['bin', 0, 5], ['cactus', -1, 3]],
  },
  hr: {
    layout: 'pods',
    items: [['window', 0, 1], ['frame', 3, 1], ['poster', 5, 1], ['plant', 0, 2], ['sofa', 2, 2, 2], ['cabinet', 5, 2], ['plant', -1, 2], ['armchair', -1, 7]],
    rug: ['rug-3x2', 3, 3, 2],
    extra: [['coat-rack', 1, 2], ['frame', 7, 1], ['cactus', 4, 2], ['plant', 0, 6], ['bin', 0, 7], ['shelf', 6, 2, 2], ['lamp', 0, 3], ['coat-rack', -1, 3], ['plant', -1, 6]],
  },
  it: {
    layout: 'stagger',
    items: [['monitors', 0, 1, 2], ['clock', 3, 1], ['server', 0, 2], ['server', 1, 2], ['server', 2, 2], ['cabinet', 4, 2], ['plant', -1, 2], ['boxes', -1, 7]],
    extra: [['monitors', 5, 1, 2], ['server', 3, 2], ['server', 5, 2], ['server', 6, 2], ['cabinet', 0, 3], ['server', 0, 4], ['server', 0, 5], ['bin', 0, 7], ['cactus', 0, 6], ['lamp', -1, 3]],
  },
  sales: {
    layout: 'benches',
    items: [['whiteboard', 2, 1, 2], ['frame', 5, 1], ['globe', 0, 2], ['shelf', 2, 2, 2], ['plant', -1, 2], ['cooler', -1, 7]],
    rug: ['rug-4x2', 3, 4, 2],
    extra: [['chart', 7, 1, 2], ['trophy', 4, 2], ['trophy', 5, 2], ['frame', 1, 1], ['poster', 8, 1], ['cabinet', 0, 3], ['trophy', 0, 6], ['plant', 0, 7], ['lamp', -1, 3], ['bin', -1, 6]],
  },
  legal: {
    layout: 'ring',
    items: [['frame', 0, 1], ['frame', 3, 1], ['shelf', 0, 2, 2], ['shelf', 2, 2, 2], ['shelf', 6, 2, 2], ['plant', -1, 2], ['lamp', -1, 7]],
    rug: ['rug-3x2', 3, 3, 2],
    extra: [['scales', 4, 2], ['scales', 5, 2], ['frame', 6, 1], ['frame', 8, 1], ['cabinet', 0, 3], ['cabinet', 0, 4], ['cabinet', 0, 5], ['lamp', 0, 6], ['plant', 0, 7], ['coat-rack', -1, 3], ['bin', -1, 6]],
  },
  ops: {
    layout: 'scatter',
    items: [['window', 0, 1], ['clock', 3, 1], ['poster', 5, 1], ['box-shelf', 0, 2, 2], ['boxes', 3, 2], ['conveyor', 4, 2, 2], ['plant', -1, 2], ['boxes', -1, 7]],
    extra: [['pallet', 0, 6, 2], ['pallet', 2, 7, 2], ['boxes', 5, 2], ['boxes', 6, 2], ['box-shelf', 7, 2, 2], ['poster', 7, 1], ['whiteboard', 8, 1, 2], ['boxes', 0, 3], ['boxes', 0, 4], ['boxes', -1, 3], ['boxes', -1, 6]],
  },
  marketing: {
    layout: 'scatter',
    items: [['poster', 0, 1], ['poster', 2, 1], ['frame', 4, 1], ['easel', 0, 2], ['easel', 2, 2], ['shelf', 4, 2, 2], ['plant', -1, 2], ['lamp', -1, 7]],
    rug: ['rug-3x2', 3, 3, 2],
    extra: [['poster', 6, 1], ['poster', 8, 1], ['easel', 5, 2], ['easel', 6, 2], ['globe', 7, 2], ['lamp', 0, 3], ['plant', 0, 6], ['easel', 0, 7], ['frame', 1, 1], ['bin', -1, 6], ['cactus', -1, 3]],
  },
  procurement: {
    layout: 'stagger',
    items: [['window', 0, 1], ['clock', 2, 1], ['poster', 4, 1], ['box-shelf', 0, 2, 2], ['boxes', 3, 2], ['boxes', 4, 2], ['cabinet', 5, 2], ['plant', -1, 2], ['boxes', -1, 7]],
    extra: [['ledger', 5, 1], ['ledger', 6, 1], ['box-shelf', 6, 2, 2], ['pallet', 0, 6, 2], ['boxes', 0, 3], ['boxes', 0, 4], ['cabinet', 0, 5], ['clock', 8, 1], ['plant', -1, 3], ['bin', -1, 6]],
  },
  service: {
    layout: 'ring',
    items: [['window', 0, 1], ['frame', 3, 1], ['clock', 5, 1], ['counter', 0, 2, 2], ['coffee-machine', 2, 2], ['plant', 3, 2], ['cabinet', 5, 2], ['bin', -1, 7]],
    rug: ['rug-4x2', 2, 4, 2],
    extra: [['poster', 7, 1], ['coat-rack', 6, 2], ['microwave', 1, 2], ['lamp', 0, 3], ['plant', 0, 6], ['armchair', 0, 7], ['cabinet', 0, 4], ['bin', -1, 3], ['cactus', -1, 6]],
  },
  intro: {
    // A single demo desk in the middle, a big whiteboard and two monitors on the back wall: a briefing room.
    layout: 'solo',
    items: [['whiteboard', 1, 1, 2], ['monitors', 4, 1, 2], ['frame', 7, 1], ['plant', 0, 2], ['sofa', 1, 2, 2], ['shelf', 4, 2, 2], ['plant', -1, 2], ['cooler', -1, 7]],
    rug: ['rug-4x2', 3, 4, 2],
    extra: [['poster', 8, 1], ['pinboard', 9, 1, 2], ['cabinet', 0, 3], ['armchair', 0, 6], ['plant', 0, 7], ['lamp', -1, 3], ['bin', -1, 6], ['coffee-machine', 7, 2], ['mug', 6, 2]],
  },
  print: {
    items: [['window', 0, 1], ['poster', 4, 1], ['clock', 7, 1], ['plant', 0, 2], ['printer', 1, 2, 2], ['printer', 4, 2, 2], ['box-shelf', 7, 2, 2], ['boxes', 0, 6], ['boxes', 1, 6], ['cabinet', 3, 6], ['bin', -1, 7]],
    rug: ['rug-3x2', 4, 3, 2],
    extra: [['printer', 6, 2, 2], ['cabinet', 5, 6], ['boxes', 0, 4], ['boxes', 0, 5], ['box-shelf', 1, 6, 2], ['boxes', 6, 6], ['boxes', 7, 6], ['poster', 1, 1], ['ledger', 2, 1], ['cabinet', -1, 3], ['cabinet', -1, 6], ['cactus', 0, 3]],
  },
  cafeteria: {
    items: [['window', 0, 1], ['frame', 4, 1], ['clock', 6, 1], ['counter', 0, 2, 2], ['coffee-machine', 2, 2], ['fridge', 3, 2], ['vending-red', 4, 2], ['vending-blue', 5, 2], ['plant', -1, 2],
      ['round-table', 2, 4], ['round-table', 5, 4], ['round-table', 8, 4], ['round-table', 3, 6], ['round-table', 7, 6], ['lamp', -1, 7], ['bin', 0, 7]],
    extra: [['microwave', 3, 2], ['microwave', 6, 2], ['cooler', 6, 2], ['poster', 7, 1], ['frame', 8, 1], ['round-table', 0, 6], ['round-table', 9, 6], ['plant', 0, 3], ['coffee-machine', 7, 2], ['lamp', 0, 7], ['plant', -1, 6], ['cactus', 0, 4]],
  },
  workspace: {
    desks: [[1, 3], [4, 3], [1, 5], [4, 5]],
    items: [['window', 0, 1], ['whiteboard', 3, 1, 2], ['clock', 6, 1], ['plant', 0, 2], ['shelf', 2, 2, 2], ['plant', -1, 2], ['bin', -1, 7]],
    extra: [['coat-rack', 1, 2], ['cabinet', 5, 2], ['cabinet', 6, 2], ['printer', 7, 2, 2], ['coffee-machine', 4, 2], ['poster', 7, 1], ['frame', 8, 1], ['monitors', 9, 1, 2], ['lamp', 0, 3], ['cactus', 0, 7], ['cooler', -1, 3], ['plant', -1, 6], ['bin', 0, 6], ['lamp', -1, 7]],
  },
};

// Second decoration pass inspired by general office prop variety (pinboards, copiers, folders, crates, extinguishers).
const MORE = {
  finance: [['pinboard', 5, 1, 2], ['extinguisher', -1, 5], ['folders', 8, 2], ['plant-bush', 0, 5]],
  hr: [['mug', 1, 2], ['mug', 6, 2], ['pinboard', 1, 1, 2], ['plant-bush', 3, 7], ['folders', 7, 2], ['extinguisher', -1, 5]],
  it: [['pinboard', 3, 1, 2], ['extinguisher', 0, 2], ['copier', 7, 2, 2], ['folders', 4, 7]],
  sales: [['mug', 1, 2], ['mug', 6, 2], ['pinboard', 3, 1, 2], ['plant-bush', 0, 5], ['folders', 8, 2], ['extinguisher', -1, 7]],
  legal: [['pinboard', 1, 1, 2], ['folders', 6, 7], ['plant-bush', -1, 7], ['extinguisher', -1, 5]],
  ops: [['crate-stack', 4, 6], ['crate-stack', 6, 6], ['crate-stack', 8, 6], ['pinboard', 3, 1, 2], ['extinguisher', -1, 5]],
  marketing: [['pinboard', 8, 1, 2], ['plant-bush', 0, 4], ['folders', 8, 7], ['extinguisher', -1, 5]],
  procurement: [['pinboard', 3, 1, 2], ['crate-stack', 5, 7], ['crate-stack', 7, 7], ['folders', 8, 2], ['extinguisher', -1, 5]],
  service: [['mug', 1, 2], ['mug', 6, 2], ['pinboard', 3, 1, 2], ['copier', 5, 2, 2], ['plant-bush', 7, 7], ['folders', 8, 7]],
  print: [['copier', 3, 2, 2], ['pinboard', 5, 1, 2], ['crate-stack', 8, 6], ['folders', 2, 7], ['extinguisher', -1, 5]],
  cafeteria: [['mug', 1, 2], ['mug', 6, 2], ['pinboard', 1, 1, 2], ['plant-bush', 0, 5], ['plant-bush', -1, 4], ['extinguisher', -1, 7]],
  workspace: [['mug', 1, 2], ['mug', 6, 2], ['pinboard', 3, 1, 2], ['plant-bush', 3, 7], ['plant-bush', 7, 7], ['folders', 9, 7], ['extinguisher', -1, 5]],
};

const WALL_SPRITES = new Set(['window', 'frame', 'clock', 'poster', 'whiteboard', 'chart', 'monitors', 'ledger', 'pinboard']);

// Places furniture from a catalogue entry into a room. Pieces that would land outside the room, on a doorway,
// in the door apron or on top of another prop are skipped; slot desks must always fit and throw otherwise.
function furnish(def, apron) {
  const { x, y, w, h } = def;
  const decor = DECOR[def.decor ?? def.id];
  const col = (dx) => (dx < 0 ? x + w + dx : x + dx);
  const taken = new Set();
  const occupy = (p) => {
    if (p.layer === 'floor') return;
    for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) taken.add(key(p.x + i, p.y + j));
  };
  props.forEach(occupy);
  const fits = ([sprite, dx, row, pw = 1]) => {
    const px = col(dx);
    const py = y - 2 + row;
    const wall = WALL_SPRITES.has(sprite);
    const cells = Array.from({ length: pw }, (_, i) => [px + i, py]);
    const inside = cells.every(([cx, cy]) => cx >= x && cx < x + w && cy >= y - 1 && cy < y + h);
    const onDoor = cells.some(([cx, cy]) => doorCells.has(key(cx, cy)));
    const inApron = !wall && cells.some(([cx, cy]) => apron.has(key(cx, cy)));
    const blocked = cells.some(([cx, cy]) => taken.has(key(cx, cy)));
    return inside && !onDoor && !inApron && !blocked ? { px, py, wall, pw } : null;
  };
  const place = (entry) => {
    const spot = fits(entry);
    if (!spot) return false;
    const p = { sprite: entry[0], x: spot.px, y: spot.py, w: spot.pw, h: 1, ...(spot.wall ? { solid: false } : {}) };
    props.push(p);
    occupy(p);
    return true;
  };
  if (decor.rug) rug(decor.rug[0], x + decor.rug[1], y + 2, decor.rug[2], decor.rug[3]);
  // Slot desks go first (they must always fit); decorative pieces then fill the remaining cells.
  const layout = def.layout ?? decor.layout;
  if (layout) {
    LAYOUTS[layout].forEach(([dx, dy], i) => {
      const cells = [key(x + dx, y - 2 + dy), key(x + dx + 1, y - 2 + dy), key(x + dx, y - 1 + dy), key(x + dx + 1, y - 1 + dy)];
      if (cells.some((c) => apron.has(c) || doorCells.has(c))) throw new Error(`Desk ${def.id}-${i + 1} blocks the doorway`);
      if (cells.some((c) => taken.has(c))) throw new Error(`Desk ${def.id}-${i + 1} overlaps furniture`);
      if (x + dx + 1 >= x + w || y - 1 + dy >= y + h) throw new Error(`Desk ${def.id}-${i + 1} is outside the room`);
      desk(def.id, i + 1, x + dx, y - 2 + dy);
      occupy({ x: x + dx, y: y - 2 + dy, w: 2, h: 2 });
    });
  }
  decor.items.forEach(place);
  (decor.desks ?? []).forEach(([dx, dy]) => {
    const cells = [key(x + dx, y - 2 + dy), key(x + dx + 1, y - 2 + dy), key(x + dx, y - 1 + dy), key(x + dx + 1, y - 1 + dy)];
    if (x + dx + 1 >= x + w || y - 1 + dy >= y + h) return;
    if (cells.some((c) => apron.has(c) || doorCells.has(c) || taken.has(c))) return;
    add('desk', x + dx, y - 2 + dy, 2, 1);
    chair(x + dx, y - 1 + dy);
    occupy({ x: x + dx, y: y - 2 + dy, w: 2, h: 2 });
  });
  [...(decor.extra ?? []), ...(MORE[def.decor ?? def.id] ?? [])].forEach(place);
}

// ---- the floor plan ----
// Department ids match the KPN use case id prefixes (CON-01 -> con). `sign` reuses an existing plaque icon,
// `decor` a furniture set, `layout` overrides the desk arrangement so the desks keep clear of the doorway.
const dept = (def) => ({ type: 'department', dept: def.id, ...def });
const PLAN = [
  // top band: four department rooms with doors onto H1
  dept({ id: 'con', name: 'Consumer', tint: 'mint', floor: 'checker', sign: 'service', decor: 'finance', layout: 'leftpack', x: 1, y: 3, w: 8, h: 7, door: { side: 'bottom', at: 2 } }),
  dept({ id: 'sme', name: 'Business SME', tint: 'lavender', floor: 'dots', sign: 'sales', decor: 'hr', x: 10, y: 4, w: 9, h: 6, door: { side: 'bottom', at: 6 } }),
  dept({ id: 'noi', name: 'Network, Ops & IT', tint: 'ice', floor: 'tiles8', sign: 'it', decor: 'it', layout: 'ring', x: 20, y: 3, w: 9, h: 7, door: { side: 'bottom', at: 7 }, signX: 24 }),
  dept({ id: 'tso', name: 'Tailored Solutions', tint: 'sky', floor: 'planks', sign: 'legal', decor: 'legal', layout: 'leftpack', x: 30, y: 3, w: 8, h: 7, door: { side: 'bottom', at: 2 } }),
  // middle band: Finance and People & Learning hang below H1, the General room sits off the spine
  dept({ id: 'fin', name: 'Finance & Control', tint: 'butter', floor: 'zigzag', sign: 'finance', decor: 'procurement', layout: 'leftpack', x: 1, y: 16, w: 9, h: 7, door: { side: 'top', at: 6 }, signX: 3 }),
  dept({ id: 'pla', name: 'People & Learning', tint: 'sand', floor: 'bands', sign: 'hr', decor: 'service', layout: 'ring', x: 11, y: 16, w: 10, h: 7, door: { side: 'top', at: 4 } }),
  { id: 'general', name: 'General', type: 'general', tint: 'grey', floor: 'grid', x: 26, y: 16, w: 11, h: 14, door: { side: 'left', at: 2 } },
  // lower-middle band: LCE and Wholesale below H2, the Chat vs Cowork room off the spine (first room on the way up from the reception)
  dept({ id: 'lce', name: 'Business LCE', tint: 'sage', floor: 'hatch', sign: 'ops', decor: 'ops', x: 1, y: 29, w: 10, h: 6, door: { side: 'top', at: 7 }, signX: 5 }),
  dept({ id: 'who', name: 'Wholesale', tint: 'peach', floor: 'diamond', sign: 'procurement', decor: 'marketing', x: 12, y: 29, w: 9, h: 6, door: { side: 'top', at: 7 }, signX: 16 }),
  { id: 'intro', name: 'Chat vs Cowork', type: 'intro', tint: 'blush', floor: 'stripes', sign: 'intro', decor: 'intro', x: 26, y: 33, w: 10, h: 6, door: { side: 'left', at: 2 } },
  // bottom band: the functional rooms, with the reception (spawn) at the foot of the spine
  { id: 'workspace', name: 'Open workspace', type: 'tip', tint: 'sky', floor: 'dots', x: 1, y: 41, w: 10, h: 5, door: { side: 'top', at: 7 } },
  { id: 'cafeteria', name: 'Cafeteria', type: 'tip', tint: 'butter', floor: 'checker', x: 13, y: 41, w: 8, h: 5, door: { side: 'top', at: 2 } },
  { id: 'lounge', name: 'Lounge and pantry', type: 'tip', tint: 'peach', floor: 'planks', x: 26, y: 46, w: 10, h: 7, door: { side: 'top', at: 2 } },
  { id: 'print', name: 'Print room', type: 'tip', tint: 'grey', floor: 'hatch', x: 1, y: 52, w: 8, h: 6, door: { side: 'top', at: 3 } },
  { id: 'lobby', name: 'Reception', type: 'tip', tint: 'ice', floor: 'diamond', x: 12, y: 53, w: 12, h: 7, door: { side: 'top', at: 10 }, signX: 20 },
];

PLAN.forEach(carve);
const aprons = new Map(PLAN.map((def) => [def.id, door(def)]));

// Hand-furnished rooms: reception, lounge and the general meeting room.
function furnishLobby(def) {
  const { x, y } = def; // 12 x 7, top door at columns x+10..x+11 (the back wall there is cut open)
  wallDecor('window', x + 1, y - 1);
  wallDecor('poster', x + 3, y - 1);
  wallDecor('frame', x + 5, y - 1);
  wallDecor('clock', x + 7, y - 1);
  add('vending-red', x, y);
  add('vending-blue', x + 1, y);
  add('cooler', x + 2, y);
  add('bin', x + 3, y);
  add('trophy', x + 4, y);
  add('coat-rack', x + 9, y);
  add('reception', x + 5, y + 1, 3, 1);
  add('plant', x + 8, y + 1);
  add('stairs', x + 10, y + 3, 2, 3);
  rug('rug-4x3', x + 4, y + 3, 4, 3);
  add('sofa', x + 4, y + 3, 2, 1);
  add('coffee-table', x + 5, y + 4);
  add('armchair', x + 4, y + 5);
  add('armchair', x + 7, y + 5);
  add('lamp', x + 8, y + 3);
  add('lamp', x, y + 2);
  add('armchair', x, y + 4);
  add('plant', x, y + 6);
  add('plant', x + 3, y + 6);
  add('cactus', x + 9, y + 6);
  add('bin', x + 11, y + 6);
}
function furnishLounge(def) {
  const { x, y, w } = def; // 10 x 7, top door at columns x+2..x+3
  wallDecor('window', x, y - 1);
  wallDecor('frame', x + 5, y - 1);
  wallDecor('poster', x + 7, y - 1);
  add('plant', x, y);
  add('counter', x + 4, y, 2, 1);
  add('coffee-machine', x + 6, y);
  add('fridge', x + 7, y);
  add('microwave', x + 8, y);
  add('cooler', x + w - 1, y);
  rug('rug-4x3', x + 3, y + 3, 4, 3);
  add('sofa', x + 3, y + 3, 2, 1);
  add('coffee-table', x + 4, y + 4);
  add('armchair', x + 7, y + 4);
  add('round-table', x + 8, y + 2);
  add('lamp', x + w - 1, y + 3);
  add('lamp', x, y + 3);
  add('cactus', x + 1, y + 4);
  add('plant', x, y + 6);
  add('boxes', x + w - 2, y + 6);
  add('bin', x + w - 1, y + 6);
}
function furnishGeneral(def) {
  const { x, y, w, h } = def; // 11 x 14, left door at rows y+2..y+3
  wallDecor('window', x, y - 1);
  add('whiteboard', x + 3, y - 1, 2, 1, { solid: false });
  wallDecor('poster', x + 5, y - 1);
  wallDecor('ledger', x + 6, y - 1);
  wallDecor('clock', x + 7, y - 1);
  add('plant', x, y);
  add('cactus', x + 1, y);
  add('shelf', x + 2, y, 2, 1);
  add('cabinet', x + 5, y);
  add('coffee-machine', x + 7, y);
  add('coat-rack', x + 9, y);
  add('plant', x + w - 1, y);
  let n = 1;
  [1, 4, 7].forEach((dx) => desk('general', n++, x + dx, y + 1));
  [1, 4, 7].forEach((dx) => desk('general', n++, x + dx, y + 4));
  [0, 3, 6, 9].forEach((dx) => desk('general', n++, x + dx, y + 7));
  rug('rug-4x3', x + 3, y + 9, 4, 3);
  add('meeting-table', x + 3, y + 10, 4, 2);
  add('lamp', x, y + 9);
  add('lamp', x + w - 1, y + 9);
  add('plant', x + w - 1, y + h - 3);
  add('bin', x, y + h - 3);
  add('plant-bush', x + w - 1, y + h - 1);
  add('cooler', x, y + h - 1);
}
PLAN.forEach((def) => {
  if (def.id === 'lobby') furnishLobby(def);
  else if (def.id === 'lounge') furnishLounge(def);
  else if (def.id === 'general') furnishGeneral(def);
  else furnish(def, aprons.get(def.id));
});

// ---- corridor furniture ----
// Only on corridor floor and never next to a doorway.
function corridorProp(sprite, x, y) {
  if (at(x, y) !== '.') throw new Error(`Corridor prop ${sprite} at ${x},${y} is not on corridor floor`);
  for (const d of doors) if (Math.abs(d.x - x) <= 1 && Math.abs(d.y - y) <= 1) throw new Error(`Corridor prop ${sprite} at ${x},${y} is next to a doorway`);
  add(sprite, x, y);
}
[
  ['plant', 1, 11], ['lamp', 1, 13], ['bin', 12, 13], ['cooler', 21, 11], ['lamp', 30, 13], ['plant', 38, 11], ['bin', 38, 13],
  ['lamp', 22, 15], ['plant', 24, 22], ['bin', 22, 29], ['cooler', 24, 32], ['plant', 22, 40], ['lamp', 24, 46], ['bin', 24, 49],
  ['plant', 1, 24], ['lamp', 1, 26], ['bin', 13, 26], ['cooler', 16, 24],
  ['plant', 1, 36], ['lamp', 1, 38], ['bin', 12, 38], ['cooler', 20, 36],
  ['plant', 1, 47], ['lamp', 1, 49], ['cooler', 12, 49], ['bin', 18, 47], ['plant', 21, 47],
  ['cooler', 26, 41], ['bin', 33, 43], ['plant', 37, 41], ['lamp', 37, 43],
].forEach(([s, x, y]) => corridorProp(s, x, y));

// ---- outer walls ----
// Every void cell that touches a floor or door tile (8-neighbourhood) becomes wall, so the building outline follows the plan.
const WALKS = new Set(['.', 'D']);
const outline = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (at(x, y) !== ' ') continue;
    let touch = false;
    for (let dy = -1; dy <= 1 && !touch; dy++) for (let dx = -1; dx <= 1; dx++) if (WALKS.has(at(x + dx, y + dy))) { touch = true; break; }
    if (touch) outline.push([x, y]);
  }
}
outline.forEach(([x, y]) => set(x, y, '#'));

const tiles = grid.map((r) => r.join(''));

// ---- objects bound to KPN use cases ----
// Department slots `con-1..5` map to `CON-01..05`, general slots `general-1..10` to `GEN-01..10`,
// and the single intro desk opens the Chat vs Cowork explainer.
const INTRO_EXPLAINER_ID = 'intro-chat-vs-cowork';
function useCaseFor(slot) {
  const [roomId, n] = slot.id.split('-');
  if (roomId === 'intro') return INTRO_EXPLAINER_ID;
  const code = roomId === 'general' ? 'GEN' : roomId.toUpperCase();
  const deptRoom = rooms.find((r) => r.id === roomId && (r.type === 'department' || r.type === 'general'));
  return deptRoom ? `${code}-${String(n).padStart(2, '0')}` : null;
}
const objects = slots
  .map((s) => ({ id: `obj-${useCaseFor(s)}`, x: s.x, y: s.y, useCaseId: useCaseFor(s) }))
  .filter((o) => o.useCaseId);

const spawn = { x: 14, y: 58 }; // in the reception, left of the sofa corner
if (at(spawn.x, spawn.y) !== '.' || props.some((p) => p.solid !== false && p.layer !== 'floor' && spawn.x >= p.x && spawn.x < p.x + p.w && spawn.y >= p.y && spawn.y < p.y + p.h)) {
  throw new Error('Spawn tile is not free floor');
}

const out = {
  tileSize: 16,
  legend: { ' ': 'void', '#': 'wall', F: 'wallface', '.': 'floor', D: 'door' },
  spawn,
  rooms,
  slots,
  objects,
  props,
  doors,
  tiles,
};
writeFileSync(new URL('../src/data/office-map.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`rooms ${rooms.length}, slots ${slots.length}, props ${props.length}, doors ${doors.length}, ${W}x${H}`);
