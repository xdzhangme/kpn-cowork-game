# Visual Spec: Cowork Tutorial Game (Pixel Office)

Status: v5, KPN pilot slice. Companion: `docs/PRD.md`.
**Art target: `docs/visual/art-direction-pixel.png`** (original concept image generated with an AI image tool from a text description of the style; the reference artwork was not used as an input). Layout/UI sample: `docs/visual/sample.png` (page with site chrome: `docs/visual/sample.html`).
References: a pixel hospital floor plan (primary: structure and style), a cozy multi-room pixel house, Pixel Agents (pixel-agents.com). Inspiration only. All art and code are our own; the reference artwork is never copied or traced.

## 1. Scope of the pixel style

- The site chrome (header with the KPN logo, language toggle, Disclaimer, tabs) is normal site UI in KPN colours.
- **Everything inside the Tutorial Game tab is pixel art**: map, side panel, bottom buttons, dialogs, icons, borders, progress and reward UI, and the monitor frame of the scenario player.
- **Colors inside the game are theme tokens, not fixed.** The KPN delivery uses KPN green as the primary accent and KPN blue as the secondary accent (section 4). Each customer can recolor via `theme.json` and the chrome tokens at the top of `src/style.css`. Sprites keep their pixel-art palette; only UI chrome and accents are re-tinted.

## 2. Layout (from the user's sketch)

```
Site header + tabs (normal UI)
+--------------------------------------+--------------+
| Game map viewport (~68%)             | Progress     |
| camera follows the player            | panel (~32%) |
+--------------------------------------+--------------+
| [Tasks] [Map] [Tutorial] [Menu / EN|NL]   (pixel buttons)

Scenario player (opens over the map on E):
+------------------------------------------------------+
| o  CON-01 Customer issue signal brief             [x] |  <- pixel bezel
| +--------------------------------------------------+ |
| | Situation > Prompt > Run > Outcome      . . . .  | |  <- act tabs
| |                                                  | |
| |  (readable HTML content, KPN typography)         | |
| |                                                  | |
| | [Back]                 1 / 4              [Next] | |
| +--------------------------------------------------+ |
+------------------------------------------------------+
                      ===========                          <- stand
```

- Desktop only. The map is a portrait world shown through a viewport that scrolls with the player at an integer scale (2x) with `image-rendering: pixelated`. The Map button opens a full-map overview and a room jump list.
- Side panel (idle): a nudge to visit the Chat vs Cowork room until it has been seen, progress, unlocked rewards and the next recommended case. It no longer hosts the use case card.
- **Scenario player**: a `<dialog>` overlay with a pixel-art computer-monitor frame (grey bezel with a green LED, 4 px outline, screen inset, stand). Inside the screen the content is real HTML text, minimum 15 px, in Atkinson Hyperlegible with Jersey 10 for act titles. Act tabs across the top, a Back / position / Next footer. Message bubbles (colleague grey, you blue, Cowork green), file icons coloured per app (Word blue, Excel green, PowerPoint orange, Outlook blue, Teams purple), a typewriter prompt with a blinking caret, step list with a pixel progress bar and a highlighted approval card, mock app windows for the deliverable, and a two-column Chat vs Cowork comparison (Cowork column in KPN green). Timers and typing are instant under `prefers-reduced-motion`.
- Bottom buttons: Today's tasks (progress), Map, Tutorial, Menu (language EN/NL, sound, reset progress).

## 3. Pixel style

- **Final art target** is `art-direction-pixel.png`: chunky visible pixels, hard edges, no anti-aliasing or gradients, limited palette, flat shading. It is a direction, not a shippable asset sheet: production tiles and props are redrawn or cleaned up as true pixel art in that style. `sample.png` is the layout mockup (art target map + card + buttons).
- 16x16 tiles, thin blue-grey outline, 1 px top highlight and 1-2 px bottom shade on props.
- Same structure as the floor-plan reference: irregular portrait building outline, top lobby, stairwell, one narrow central corridor, rooms of different sizes and offsets on both sides, open doorways, thick pale walls with a tinted back-wall face (2 tiles) and a wainscot band, subtle tile grid floors.
- Dense decoration: rugs with borders, floor lamps, bins, water coolers, boxes, book piles, coat racks, wall frames, windows, clocks, posters, plants, desks with monitors, shelves, sofas, vending machines. People sit or stand at desks.
- UI panels and buttons use the same palette: pale panel, thin slate outline with inner white line, bottom bevel, no rounded corners, no gradients.
- **Text must be readable.** Do not bake text into the map PNG except short room signs. Card and button text is real HTML text in bundled OFL fonts, minimum 14 px on screen, supports lowercase and Dutch characters. Pixel text (titles, buttons, labels, signs) uses Jersey 10 (`docs/visual/Jersey10.ttf`); Pixelify Sans is not used because its "f" and "5" are misread. Long card and dialog text (prompt block, descriptions) uses Atkinson Hyperlegible (`docs/visual/AtkinsonHyperlegible-*.ttf`) at 16 px or larger, line height 1.7, high contrast, ligatures disabled. The pixel frame stays around the card. Scope rule: a player's required tasks are their own department's cases plus the general cases; other departments are optional, encouraged exploration with bonus rewards. The UI mock lives in `docs/ui/index.html`. Room signs use a pixel font drawn into the sprite.

## 4. Palette (theme tokens, overridable per customer)

KPN brand tokens (from KPN's public design tokens): green `#00C300` (600 `#00A800`, 700 `#008200`, 800 `#00641A`, 900 `#1E3B1E`), blue `#0066EE` (400 `#4491F7`, 700 `#003AAB`), neutrals `#131313 #333333 #737373 #B3B3B3 #D3D3D3 #E3E3E3 #F3F3F3 #FFFFFF`. KPN's proprietary font is not bundled; the template fonts are kept.

| Token | KPN value | Use |
| --- | --- | --- |
| `outline` | `#737373` | Walls and panel outlines |
| `wall` | `#F3F3F3` | Wall body, panel highlight |
| `floor` / `grid` | `#E3E3E3` / `#D3D3D3` | Corridor and default floor |
| `accent` | `#008200` (dark `#00641A`) | Room signs, wainscot, title bars, primary button |
| `panel` / `panelDark` | `#F3F3F3` / `#D3D3D3` | Side panel, buttons |
| `marker` | `#E8B84A` | Use case marker, prompt highlights |
| `done` | `#00C300` | Completed check |
| `locked` | `#B3B3B3` (outline `#737373`) | Locked silhouettes |
| `ink` / `onAccent` | `#131313` / `#FFFFFF` | Text on panels / on accent |

Site chrome: header and tab bar use `--chrome` (KPN green 700) with KPN blue focus rings. Template defaults for other customers remain in the template repository.

Room floor tints (soft, one per room, from config): mint `#c9e8d8`, lavender `#ddd3f0`, blush `#f2cfcf`, sky `#c4dbf2`, butter `#f0e2b8`, sage `#cbe3cf`, peach `#f1d9c3`, ice `#c4e1ec`, sand `#e0d9bf`, grey `#d6dde2`. Each room also has its own floor pattern (`floor` in the room data: grid, checker, dots, tiles8, stripes, bands, planks, hatch, diamond, zigzag), a wall sign plaque with a room icon, and its own furniture set and desk layout.

## 5. Character

One default character, 16x24 px, small head with a dark outline (our earlier procedural version, not the larger concept-image figures), 4 directions x 3 walk frames (+ idle). Later: palette swaps as look rewards.

### 5.1 Ambient NPCs

Decorative NPCs (human coworkers, robots, hybrid creatures) idle or wander in rooms. They never block the player (not solid) and keep out of interaction slots, objects and doors.

- Data: `src/data/npcs.json` lists NPCs by room id and look only; tiles are chosen at load time from each room's free floor, so NPCs follow layout changes.
- Sprites: `src/art/npc-sprites.js` generates them procedurally (humans 16x24, 4 directions, walk frames). Outfits, robots and creatures use theme tokens; skin and hair use fixed natural tones.
- Humans: 7 skin tones, hair styles (short, bald, long, braids, bun, curly, scarf), builds, heights, glasses, beards, and mobility aids (wheelchair, cane, white cane, prosthetic leg or arm). All are depicted with equal dignity and no stereotypes.
- Wandering is disabled under `prefers-reduced-motion`.
- Created programmatically; no image-generation API key was available, and third-party references were used as ideas only.
## 6. Map and rooms

Data-driven tile map (15 spaces):
- 8 KPN department rooms (5 use cases each): Consumer, Business SME, Tailored Solutions, Business LCE, Network Ops & IT, Wholesale, People & Learning, Finance & Control.
- 1 big General meeting room (10 GEN cases).
- 1 **Chat vs Cowork** intro room near the spawn point with a single explainer object (monitor sign icon). New players are nudged to visit it first.
- Tip rooms showing Cowork tips: Reception/lobby, Print, Open workspace, Lounge/pantry.
- 51 interactable objects (50 use cases plus the explainer). The plan can grow by adding rooms along the corridor.

## 7. Rewards and states

Categories: furniture, plants, wall decor, small appliances. Each use case owns one reward item placed in its room.
- Locked: gray silhouette (`locked`) at its final position.
- Unlocked: full color with a short pixel sparkle.
- Room decor progression: rooms gain extra decoration (rugs, lamps, frames) as their progress grows.

## 8. Use case markers (room-level)

- Room sign shows progress (e.g. `CONSUMER 2/5`).
- Optional first-run department pick with a guide arrow to that room's door.
- Inside the current room: yellow `!` bubble = not done, green check = done. Other rooms show no blinking markers.
- `E` prompt only within 1 tile of an object.

## 9. Customization

Per customer without code changes: `theme.json` (palette tokens, room tints), chrome tokens in `src/style.css`, room and department names (`src/i18n.js`), company name/logo (`src/config.js`), use case data (`public/data/`) and scenario overrides. Sprites are drawn in a limited indexed palette so the theme can recolor them; the sprite sheet can also be replaced.

## 10. Out of scope

Game code, final production assets, mobile layout, animations beyond walk cycle and unlock sparkle.


