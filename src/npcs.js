// Ambient NPCs (coworkers, robots, hybrid creatures). They are never solid for the player and only
// use floor tiles that are clear of props, doors and interaction slots. Each NPC can be talked to
// (E when adjacent) and hands out one Cowork tip from src/data/npc-tips.json (see npc-talk.js).
// NPCs are placed by room id (src/data/npcs.json), so they follow the map when the layout changes.
import { npcSprite } from './art/npc-sprites.js';
import { tileAt } from './tilemap.js';

const WALK_CYCLE = [1, 3, 2, 3];
const SPEEDS = { human: 14, robot: 18, creature: 12 };
const WHEELCHAIR_SPEED = 18;
const WANDER_RADIUS = 4; // tiles
const PLAYER_GAP = 20; // px: NPCs stop instead of walking closer than this to the player
const TALK_RANGE = 1; // tiles: the player can talk to an NPC within this Chebyshev distance

function rng(seed) {
  let a = [...seed].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Floor tiles of a room that NPCs may stand on: no solid props, and clear of doors and of the
// desk strip of each slot (desk, chair row and the reward tile) so they never mask the E prompt.
export function npcTiles(map, room) {
  const blocked = new Set();
  const block = (x, y, w, h) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) blocked.add(`${i},${j}`);
  };
  (map.props ?? []).filter((p) => p.solid !== false && p.layer !== 'floor').forEach((p) => block(p.x, p.y, p.w ?? 1, p.h ?? 1));
  (map.slots ?? []).forEach((s) => block(s.x - 1, s.y, 4, 2));
  (map.objects ?? []).forEach((o) => block(o.x - 1, o.y, 4, 2));
  (map.doors ?? []).forEach((d) => block(d.x - 1, d.y - 1, 3, 3));
  const tiles = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (tileAt(map, x, y) === 'floor' && !blocked.has(`${x},${y}`)) tiles.push({ x, y });
    }
  }
  return tiles;
}

export function createNpcs(map, defs, { reduceMotion = false } = {}) {
  const t = map.tileSize;
  const list = [];
  const byRoom = new Map();
  for (const [index, def] of defs.entries()) {
    const room = map.rooms.find((r) => r.id === def.room);
    if (!room) continue;
    if (!byRoom.has(room.id)) byRoom.set(room.id, { allowed: npcTiles(map, room), placed: [] });
    const entry = byRoom.get(room.id);
    const rand = rng(def.id);
    const set = new Set(entry.allowed.map((p) => `${p.x},${p.y}`));
    // pick a random free tile at least 3 tiles away from the NPCs already placed in this room
    // (2 tiles in small, busy rooms so every NPC still finds a spot)
    const order = [...entry.allowed].sort(() => rand() - 0.5);
    const apart = (gap) => order.find((p) => entry.placed.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= gap)) ?? null;
    const home = apart(3) ?? apart(2);
    if (!home) continue;
    entry.placed.push(home);
    list.push({
      def,
      index,
      room: room.id,
      home,
      set,
      rand,
      x: (home.x + 0.5) * t,
      y: (home.y + 1) * t - 1,
      facing: rand() < 0.5 ? 'left' : 'right',
      target: null,
      wait: rand() * 3,
      time: rand() * 5,
      moving: false,
    });
  }

  const walkable = (n, x, y) => [[-4, 0], [4, 0]].every(([dx]) => n.set.has(`${Math.floor((x + dx) / t)},${Math.floor((y - 1) / t)}`));
  const clearLine = (n, tx, ty) => {
    const steps = Math.ceil(Math.hypot(tx - n.x, ty - n.y) / 4);
    for (let i = 1; i <= steps; i++) {
      if (!walkable(n, n.x + ((tx - n.x) * i) / steps, n.y + ((ty - n.y) * i) / steps)) return false;
    }
    return true;
  };

  function pickTarget(n) {
    for (let k = 0; k < 8; k++) {
      const dx = Math.round((n.rand() - 0.5) * 2 * WANDER_RADIUS);
      const dy = Math.round((n.rand() - 0.5) * 2 * WANDER_RADIUS);
      const tx = (n.home.x + dx + 0.5) * t;
      const ty = (n.home.y + dy + 1) * t - 1;
      if (n.set.has(`${n.home.x + dx},${n.home.y + dy}`) && clearLine(n, tx, ty)) return { x: tx, y: ty };
    }
    return null;
  }

  function faceTowards(n, p) {
    if (!p) return;
    const dx = p.x - n.x;
    const dy = p.y - n.y;
    if (Math.abs(dx) >= Math.abs(dy) || n.def.kind !== 'human') {
      if (Math.abs(dx) > 2) n.facing = dx < 0 ? 'left' : 'right';
    } else n.facing = dy < 0 ? 'up' : 'down';
  }

  // The closest NPC within 1 tile (Chebyshev) of the tile under the player's feet, or null.
  function nearest(player) {
    const col = Math.floor(player.x / t);
    const row = Math.floor(player.y / t);
    let best = null;
    let bestDist = Infinity;
    for (const n of list) {
      const dist = Math.max(Math.abs(Math.floor(n.x / t) - col), Math.abs(Math.floor((n.y - 1) / t) - row));
      const exact = Math.hypot(n.x - player.x, n.y - player.y);
      if (dist <= TALK_RANGE && exact < bestDist) {
        best = n;
        bestDist = exact;
      }
    }
    return best;
  }

  function update(dt, player, focus = null) {
    for (const n of list) {
      n.time += dt;
      if (n === focus) {
        // The NPC the player can talk to stops and turns toward the player.
        n.target = null;
        n.moving = false;
        n.wait = Math.max(n.wait, 1);
        faceTowards(n, player);
        continue;
      }
      if (reduceMotion || n.def.behavior !== 'wander') continue;
      const speed = n.def.look?.wheelchair ? WHEELCHAIR_SPEED : SPEEDS[n.def.kind];
      if (!n.target) {
        n.moving = false;
        n.wait -= dt;
        if (n.wait <= 0) {
          n.target = pickTarget(n);
          n.wait = 1.5 + n.rand() * 4;
        }
        continue;
      }
      const dx = n.target.x - n.x;
      const dy = n.target.y - n.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) {
        n.target = null;
        continue;
      }
      const step = Math.min(speed * dt, dist);
      const nx = n.x + (dx / dist) * step;
      const ny = n.y + (dy / dist) * step;
      const nearPlayer = player && Math.hypot(player.x - nx, player.y - ny) < PLAYER_GAP;
      const nearNpc = list.some((o) => o !== n && Math.hypot(o.x - nx, o.y - ny) < 12);
      n.moving = !nearPlayer && !nearNpc;
      if (!n.moving) {
        if (nearNpc && !nearPlayer) n.target = null;
        continue;
      }
      n.x = nx;
      n.y = ny;
      n.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : n.def.kind === 'human' ? (dy < 0 ? 'up' : 'down') : n.facing;
    }
  }

  function frameOf(n) {
    if (n.moving) return WALK_CYCLE[Math.floor(n.time / 0.18) % WALK_CYCLE.length];
    if (n.def.kind === 'human' || reduceMotion) return 0;
    return Math.floor(n.time / 0.6) % 2; // robots and creatures keep a gentle idle loop
  }

  // Depth-sort entries (base line in map pixels + a draw function), merged with props in main.js.
  const drawables = list.map((n) => ({
    get base() {
      return n.y;
    },
    draw(ctx, camX, camY) {
      const { canvas, w, h } = npcSprite(n.def, n.facing, frameOf(n));
      ctx.drawImage(canvas, Math.round(n.x - w / 2 - camX), Math.round(n.y - h - camY + 1));
    },
  }));

  // Pixel height of the NPC's current sprite, used to hang the E prompt above its head.
  const spriteHeight = (n) => npcSprite(n.def, n.facing, frameOf(n)).h;

  return { list, update, drawables, nearest, spriteHeight };
}
