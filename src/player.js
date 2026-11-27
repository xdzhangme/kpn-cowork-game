// Player entity: keyboard movement, tile/prop collision and a 4-direction walk cycle.
// Position (x, y) is the center of the player's feet in map pixels.
import { drawCharacter } from './art/atlas.js';
import { tileAt } from './tilemap.js';

const SPEED = 64; // map pixels per second
const FRAME_TIME = 0.15; // seconds per walk frame
const FEET = { halfW: 5, h: 5 }; // collision box: 10x5 px at the feet
const SPRITE = { w: 16, h: 24 };
const WALK_CYCLE = [1, 3, 2, 3]; // frame 0 is idle, 1 and 2 are strides, 3 is the passing pose

const KEYS = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};
const VECTORS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Walkable tile kinds; every other tile kind (walls, void, ...) is solid.
const WALKABLE = new Set(['floor', 'door']);

function boxAt(x, y) {
  return { left: x - FEET.halfW, right: x + FEET.halfW, top: y - FEET.h, bottom: y };
}

// True if the feet box at (x, y) overlaps a solid tile or a solid prop.
export function blocked(map, x, y) {
  const t = map.tileSize;
  const b = boxAt(x, y);
  // right/bottom edges are exclusive so touching a wall exactly is allowed
  const col1 = Math.floor((b.right - 0.001) / t);
  const row1 = Math.floor((b.bottom - 0.001) / t);
  for (let row = Math.floor(b.top / t); row <= row1; row++) {
    for (let col = Math.floor(b.left / t); col <= col1; col++) {
      if (!WALKABLE.has(tileAt(map, col, row))) return true;
    }
  }
  return (map.props ?? []).some(
    (p) =>
      p.solid !== false &&
      b.left < (p.x + (p.w ?? 1)) * t &&
      b.right > p.x * t &&
      b.top < (p.y + (p.h ?? 1)) * t &&
      b.bottom > p.y * t,
  );
}

// Moves one axis at a time so the player slides along walls.
export function move(map, pos, dx, dy) {
  const next = { x: pos.x, y: pos.y };
  if (dx && !blocked(map, pos.x + dx, pos.y)) next.x += dx;
  if (dy && !blocked(map, next.x, pos.y + dy)) next.y += dy;
  return next;
}

// Feet position standing in the middle of a tile.
export function feetAt(map, col, row) {
  const t = map.tileSize;
  return { x: (col + 0.5) * t, y: (row + 1) * t - 1 };
}

// Tile under a feet position.
export function tileOf(map, pos) {
  const t = map.tileSize;
  return { col: Math.floor(pos.x / t), row: Math.floor(pos.y / t) };
}

// Shortest 4-connected path (BFS over tiles the feet box fits in) from `from` to `to`, both
// tile coordinates. Returns the list of tiles after the start, or null when unreachable.
export function findPath(map, from, to, maxTiles = 20000) {
  const cols = map.tiles[0].length;
  const rows = map.tiles.length;
  const key = (c, r) => r * cols + c;
  const free = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !blocked(map, feetAt(map, c, r).x, feetAt(map, c, r).y);
  if (!free(to.col, to.row)) return null;
  if (from.col === to.col && from.row === to.row) return [];
  const prev = new Map([[key(from.col, from.row), -1]]);
  const queue = [[from.col, from.row]];
  for (let i = 0; i < queue.length && i < maxTiles; i++) {
    const [c, r] = queue[i];
    for (const [dc, dr] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (prev.has(key(nc, nr)) || !free(nc, nr)) continue;
      prev.set(key(nc, nr), key(c, r));
      if (nc === to.col && nr === to.row) {
        const path = [];
        let k = key(nc, nr);
        while (k !== key(from.col, from.row)) {
          path.push({ col: k % cols, row: Math.floor(k / cols) });
          k = prev.get(k);
        }
        return path.reverse();
      }
      queue.push([nc, nr]);
    }
  }
  return null;
}

// Input must not move the player while the user is typing or a dialog is open.
export function inputBlocked() {
  const el = document.activeElement;
  if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return true;
  return Boolean(document.querySelector('dialog[open]'));
}

export function createPlayer(map, canPlay = () => true) {
  const t = map.tileSize;
  const player = {
    x: (map.spawn.x + 0.5) * t,
    y: (map.spawn.y + 1) * t - 1,
    facing: 'down',
    moving: false,
    time: 0,
  };
  const held = [];
  // Click-to-move: waypoints (feet positions in map pixels) the player walks through in order.
  let path = [];
  let onArrive = null;

  window.addEventListener('keydown', (e) => {
    const dir = KEYS[e.key];
    if (!dir || e.ctrlKey || e.metaKey || e.altKey || inputBlocked() || !canPlay()) return;
    e.preventDefault();
    if (!held.includes(dir)) held.push(dir);
    player.clearPath(); // any keyboard movement cancels a mouse route
  });
  window.addEventListener('keyup', (e) => {
    const dir = KEYS[e.key];
    if (dir) held.splice(0, held.length, ...held.filter((d) => d !== dir));
  });
  window.addEventListener('blur', () => (held.length = 0));

  // Starts walking to a tile along a BFS path; `arrive` runs once the last waypoint is reached.
  // Returns false (and changes nothing) when the tile is unreachable.
  player.walkTo = (tile, arrive = null) => {
    const steps = findPath(map, tileOf(map, player), tile);
    if (!steps) return false;
    path = steps.map((s) => feetAt(map, s.col, s.row));
    onArrive = arrive;
    if (!path.length) {
      onArrive = null;
      arrive?.();
    }
    return true;
  };
  player.clearPath = () => {
    path = [];
    onArrive = null;
  };
  // Destination of the current mouse route (map pixels), or null when idle.
  player.destination = () => (path.length ? path[path.length - 1] : null);

  function followPath(dt) {
    const next = path[0];
    const dx = next.x - player.x;
    const dy = next.y - player.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.min(SPEED * dt, t / 2);
    if (dist <= step) {
      player.x = next.x;
      player.y = next.y;
      path.shift();
      if (!path.length) {
        const done = onArrive;
        onArrive = null;
        done?.();
      }
      return;
    }
    player.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    const moved = move(map, player, (dx / dist) * step, (dy / dist) * step);
    if (moved.x === player.x && moved.y === player.y) player.clearPath(); // something is in the way
    player.x = moved.x;
    player.y = moved.y;
  }

  player.update = (dt) => {
    if (inputBlocked() || !canPlay()) {
      held.length = 0;
      player.clearPath();
    }
    // the most recently pressed key wins; opposite keys do not cancel out
    const dir = held[held.length - 1];
    player.moving = Boolean(dir) || path.length > 0;
    if (!dir && path.length) {
      player.time += dt;
      followPath(dt);
      return;
    }
    if (!dir) return;
    player.facing = dir;
    player.time += dt;
    const [vx, vy] = VECTORS[dir];
    const step = Math.min(SPEED * dt, t / 2);
    const next = move(map, player, vx * step, vy * step);
    player.x = next.x;
    player.y = next.y;
  };

  player.frame = () => (player.moving ? WALK_CYCLE[Math.floor(player.time / FRAME_TIME) % WALK_CYCLE.length] : 0);

  return player;
}

// Draws the 16x24 character sprite (4 directions x 4 frames) from the art atlas.
export function drawPlayer(ctx, player, camX, camY) {
  drawCharacter(ctx, player.facing, player.frame(), player.x - camX - SPRITE.w / 2, player.y - camY - SPRITE.h);
}