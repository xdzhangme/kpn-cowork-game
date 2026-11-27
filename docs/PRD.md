# PRD: Cowork Tutorial Game (Pixel Office)

Status: v2, KPN pilot slice (template PRD plus the KPN customisation; see section 13)

## 1. Goal

A lightweight, reusable, static website that helps employees of customer companies
discover and practice Cowork through a 2D top-down pixel-art office game.
The author delivers Cowork to customer companies; each delivery can be customized by
swapping content (and later, the map) without changing game code.

- Not a competitive or level-based game. It is an exploration + learning game.
- Primary value: experience a realistic work situation, watch Cowork solve it, and understand why Cowork is more valuable than Copilot Chat for that kind of work.
- Priority: fast time to a working result; small, simple repo.

## 2. Player

Employees of a customer company, with mixed roles and little prior Cowork experience.
The author (a Cowork delivery lead) is the content owner and operator.

## 3. Product Shape

A single-page static site with a header (company badge + name, EN/NL toggle, Disclaimer
button) and four tabs:

1. **Tutorial Game** (first/default tab): the pixel-office game.
2. **Use Case Library**: all use cases as full, readable cards (search, suggestions, department/role rail, more filters, active-filter chips, count), each with prompt, See it run, Fit it into your work, How it works and a Why Cowork section with a Chat/Cowork toggle.
3. **How to start**: mock Cowork run, Cowork vs Chat comparison, five steps, extension options, the interactive library folder (pages fan out, hover/focus previews guidance, links switch tabs) and the recurring-workflows lifecycle ring (five stages, marker dot and highlight pill, auto-advance until the reader picks a stage).
4. **Responsible AI**: grouped governance tiles (Data, Oversight, Region and cost, Limits) with the reference's hover/focus lift, tilt and pixel-texture effect, and tenant-setting chips.

Tabs 2-4 follow the approved KPN use-case landing page design (its `card-styles` and `shell-styles` CSS, re-scoped under `.kpn-doc`; Segoe UI 17px body; ink/blue/wash/line/muted/teal tokens with KPN green as brand). The game tab keeps the pixel style. The Library opens on the reference page's "company landing": a Choose-a-department grid of eight department tiles (KPN green / black / yellow fills) plus a General tile; picking a tile filters to that department, and clearing every filter returns to the grid. The reference's separate opening screen (multi-megabyte embedded preview) is not adopted.

The Library is the content source. It serves two purposes: readable directly by users,
and shared as the data that drives the game.

## 4. Core Loop

1. Player walks around the office map (free exploration; a light guide points to a first spot, and new players are nudged to the Chat vs Cowork intro room).
2. Player presses **E** at an interactable object to open a use case.
3. The **scenario player** opens as a large overlay over the map and plays four acts, advanced with Next (no autoplay, Back allowed, Esc closes):
   1. **Situation**: a fictional but realistic work situation (message bubbles, input files).
   2. **Prompt**: the Cowork prompt appears with a typewriter effect. The player never selects or types anything.
   3. **Run**: Cowork's steps light up one by one, including the approval pause.
   4. **Outcome**: a preview of the deliverable, the done-when checklist, the qualitative value, and the Chat vs Cowork comparison.
4. Reaching Act 4 marks the case complete; a visual reward is unlocked and appears in the office.
5. Optionally the player copies the prompt or opens Cowork to try it for real, and ticks "I tried this at work" (secondary flag).

Guidance: first-time players get a short guided path; afterwards they can explore freely.

## 5. Use Case Card (content model)

Fields per case (KPN library export, see `docs/USE-CASE-SCHEMA.md`):

- Title, one-line hook, icon
- Metadata: department, roles, workload, execution mode, capabilities, collaboration scope (credits exist in the data but are never shown)
- **The prompt**: outcome, inputs, done-when, constraints, approval; buttons **Copy prompt**, **Try in Cowork**, **Play scenario**
- **Run**: user message, Cowork reply, steps with one or more approval pauses, example result
- **Fit it into your work**, **How it works**, **Why Cowork** (chat vs cowork bullets)
- Bilingual text (EN and NL files)
- Optional hand-polished scenario override (situation messages, files, deliverable preview)

## 6. Library -> Game Data Contract

- One JSON entry per use case per language (`public/data/kpn-use-cases-{en,nl}.json`), shared by the Library tab, the game objects and the scenario player.
- Game object placement on the map references a use case by id; rooms are assigned by department.
- **Play scenario** switches to the Tutorial Game tab and opens the scenario player for that case.
- Adding or editing a use case = replacing the JSON export; no code change. Hand-polish goes in `src/data/scenario-overrides.json`.
- The Library lists all use cases; the map places all of them as interactables.

## 7. Rules -> Entities / States / Interactions

| Concept | Description |
| --- | --- |
| Player | Moves with arrow keys/WASD or by clicking a floor tile (BFS path on walkable tiles; keyboard cancels the route), interacts with E; clicking a desk or NPC walks adjacent and opens it |
| Interactable | Map object bound to a use case id (or the intro explainer) |
| Scenario player | Four-act overlay (Situation, Prompt, Run, Outcome); Next/Back/Esc |
| Use case state | `new` -> `completed` (on reaching Act 4); optional `tried at work` flag |
| Reward | Visual item bound to a use case; locked -> unlocked, rendered in the office |
| Progress | Completed use case ids and tried flags stored in `localStorage` |

No win/lose condition. Progress indicator: number of use cases completed and rewards unlocked.

## 8. MVP Scope

- Single map (tile-based, data-driven JSON), one player character
- Movement, collision, E-key interaction
- Scenario player overlay inside the game (four acts)
- Completion on reaching the Outcome act and reward unlock, persisted in `localStorage`
- Library tab with all use cases, shared JSON data, "Play scenario" deep link
- EN/NL language toggle
- Header and Disclaimer; Library, How to start and Responsible AI panes in the approved KPN landing-page design (`src/library-ui.js`, `src/doc-card.js`, `src/start-pane.js`, `src/governance-pane.js`)
- Static deployment (no backend)

## 9. Later (not MVP)

- Multiple maps / per-customer map themes
- Additional reward types (character looks, new rooms, badges)
- Optional feedback export

## 10. Non-Goals

- Backend, accounts, server-side progress
- Real verification of completion
- Multiplayer
- Combat or level-based gameplay
- Map editor
- More than two languages, more than one map in v1

## 11. Constraints

- Lightweight: simple game, few files, no heavy frameworks; fast to build.
- Existing prototype (branch `xdzhangme-pixel-office-template`: Vite + Canvas, JSON map, E-key interaction, `src/rules.js` hook) is a technical reference, not final.
- All repository documentation is English.

## 12. Open Questions (to resolve in later steps)

- Reward art per case (currently generic items per room)
- Hand-polished scenarios for the remaining 47 cases (currently template-generated)
- Whether to add more intro-room content (for example a KPN-specific Responsible AI screen)

## 13. KPN pilot slice

The first customised delivery, for KPN:

- **Data**: KPN's 50-case use-case library (EN and NL) replaces the template sample data. Credits are hidden.
- **Rooms**: 8 department rooms (Consumer, Business SME, Tailored Solutions, Business LCE, Network Ops & IT, Wholesale, People & Learning, Finance & Control), the General room for the 10 GEN cases, a **Chat vs Cowork** intro room with a global explainer object, and the 5 functional rooms (lobby, print room, open workspace, cafeteria, lounge). The floor plan is a varied office rather than a grid: department rooms of different sizes and offsets occupy the upper and middle floors along branching corridors, the General and intro rooms sit on the right of the main corridor, and the functional rooms are scattered along the bottom band where the player spawns (in the lobby). The Map overlay draws each room's short name inside its rectangle and supports click-to-jump; Today's tasks lists only the explainer and the player's required cases (own department plus general).
- **Talking NPCs**: every NPC can be talked to with E. Each gives one short Cowork usage tip (EN and NL) paraphrased from official Microsoft Learn / Microsoft Adoption pages, with a source link shown in the dialog (`src/data/npc-tips.json`).
- **Branding**: KPN logo in the header, KPN green as primary accent and KPN blue as secondary, KPN neutral greys; template fonts kept (no proprietary KPN font).
- **Scenario player** replaces the side card for use cases (section 4). All 50 scenarios are template-generated; CON-01, GEN-01 and FIN-01 are hand-polished via overrides.
- **Chat vs Cowork comparison** closes every scenario: a generic Copilot Chat column (paste files one by one, re-ask, copy results yourself, remember to review) against the case's actual Cowork run steps. The key message: Cowork is more valuable than Copilot Chat for this kind of work.
- **Completion** is recorded when the player reaches Act 4; "I tried this at work" is a secondary flag.
