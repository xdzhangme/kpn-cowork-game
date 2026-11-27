# Manual smoke checklist

Run against the deployed GitHub Pages site (or `npm run preview`) in a desktop browser. Open the developer console first and keep it visible.

## Load
- [ ] On first visit a department picker appears, followed by the six-screen "How to play" guide (movement and E, talking to colleagues for tips, yellow bubbles, the four acts, the Chat vs Cowork room, progress, taking a prompt to work). Next walks through it; the last button reads "Start playing"; Esc or x closes it at any time.
- [ ] The guide can be reopened with the green Guide button in the header (also from other tabs; it switches to the game) and with How to play in the bottom bar. It always restarts at screen 1.
- [ ] Page loads with no errors or warnings in the console.
- [ ] Header shows the KPN logo, "Cowork tutorial game", the Guide button and the Disclaimer button; fonts render as pixel/legible fonts (no fallback serif). The browser tab title is "KPN Cowork game".
- [ ] The office map renders on the canvas and the player is visible in the lobby at the bottom of the building. Room signs read Consumer, Business SME, Tailored Solutions, Business LCE, Network Ops & IT, Wholesale, People & Learning, Finance & Control, General and Chat vs Cowork.

## Tabs
- [ ] Four tabs are present: Tutorial Game, Use Case Library, How to start, Responsible AI.
- [ ] Clicking each tab shows only its panel; the selected tab is highlighted.
- [ ] How to start shows the hero with the mock Cowork run (steps light up, Approve completes it, Replay restarts), the Cowork vs Chat toggle, the five steps, Extend Cowork cards, the library folder (click the yellow folder: six pages fan out; hover or focus a page to preview it in the right card; its link switches tab) and the recurring-workflows ring (five stages auto-advance about every 4.5 s while on screen; hovering pauses, clicking a stage selects it and stops auto-advance; the marker dot and yellow pill move to the active stage). Responsible AI shows four groups (Data, Oversight, Region and cost, Limits), ten tiles, the two "off" tenant chips and the banner; hovering or focusing a tile lifts and tilts it and fades in the green pixel texture. Both panes switch to Dutch with NL.
- [ ] Disclaimer button opens the dialog; Close dismisses it.

## Language
- [ ] Open the menu in the bottom bar and switch to Dutch: tabs, bottom bar, library cards, scenario player and info pages are all translated (case titles come from the NL data file).
- [ ] Reload the page: Dutch is still selected.
- [ ] Switch back to English.

## Intro room
- [ ] The side panel nudges new players to visit the Chat vs Cowork room first.
- [ ] Press E at the explainer object: the monitor overlay opens with the Chat vs Cowork introduction; Next walks through all screens; the last screen's button says Done and closes the overlay.
- [ ] After that, the nudge in the side panel disappears.

## Scenario player
- [ ] Walk next to a use-case object and press E: a large monitor overlay opens over the map (not a side card). Movement is blocked while it is open.
- [ ] Act 1 Situation: a lead line, file icons coloured per app (Word blue, Excel green, PowerPoint orange, Outlook, Teams purple) and chat-style message bubbles.
- [ ] Act 2 Prompt: the Cowork prompt types itself; the Next button reads Skip while typing and finishes the text instantly; a Cowork reply bubble follows; "The Cowork prompt" expands the labelled prompt (Outcome, Inputs, Done when, Constraints, Approval) as real text with highlighted [placeholders], never "[object ...]". A green "Take it to work" box with Copy prompt and Open Cowork appears once typing has finished. The player never has to type or choose anything.
- [ ] Act 3 Run: steps light up one by one with a progress bar; the approval step shows a highlighted approval card; Next reads "Approve and continue" and is disabled until the steps have finished.
- [ ] Act 4 Outcome: a "Scenario completed" banner, a mock deliverable window (Word/Excel/PowerPoint/Outlook/Teams per case), the done-when checklist, "Why this matters", the "Take it to work" box (Copy prompt, Open Cowork) in the right column and the two-column Chat vs Cowork comparison (Copilot Chat on the left, Cowork in green on the right). No empty boxes in either column.
- [ ] Back returns to the previous act; Esc, the x button or clicking the backdrop closes the overlay. Arrow keys and Enter also advance.
- [ ] Reaching Act 4 marks the case complete: the room sign counter increases, a reward appears in the room and the bottom bar counter increases (out of 50).
- [ ] "I tried this at work" checkbox toggles and survives a reload. Copy prompt copies the full labelled prompt and the button reads "Copied!" for a moment; Open Cowork opens the Cowork link (`coworkUrl` in `src/config.js`) in a new tab.
- [ ] Check at least CON-01, GEN-01 and FIN-01 (hand-polished: named files, several messages, a specific deliverable), one unpolished case (template-generated content, e.g. LCE-02) and NOI-05 (two approval pauses).

## Library
- [ ] The Use Case Library opens on the "Choose a department" grid: eight department tiles (green / black / yellow fills, "5 use cases" each) under Business areas and one white General tile ("10 use cases"). Clicking Consumer shows its 5 cards with a Consumer chip and an "All departments" back link; removing the chip (or Reset) returns to the grid. Typing in search or ticking any filter also leaves the grid; "Show all use cases" lists all 50.
- [ ] With "Show all use cases" the library shows "50 of 50 use cases shown"; the search box narrows the list and shows title suggestions (clicking one opens that card); Try chips fill the search; ticking a Department or Role narrows the count and adds a removable chip; More filters reveals Workload, Scope, Capability and Execution mode; the Reset button in the empty state clears everything. No credits are shown anywhere.
- [ ] Opening a card shows the prompt with highlighted brackets, Copy prompt copies it ("Copied"), See it run opens the run dialog (steps appear one by one, Proposed / Check / Weak tabs, flags and "Show me all" reveal), Fit it into your work rewrites the prompt from the chips and fields, and Why Cowork toggles between Chat and Cowork lists with a verdict.
- [ ] Completed cases are marked as done.
- [ ] "Play scenario" on a card opens the Tutorial Game tab with the scenario player for that case.

## Game loop
- [ ] Move with arrow keys / WASD; the player cannot walk through walls or furniture.
- [ ] Click a floor tile (also in another room): a pulsing target marker appears and the player walks there along the corridors; pressing a movement key cancels the route. Clicking a wall or furniture shows a brief x and does nothing.
- [ ] Click a desk with a bubble: the player walks next to it and the scenario opens. Click an NPC: the player walks over and the tip dialog opens. Canvas clicks are ignored while any dialog is open.
- [ ] Tasks panel shows progress, unlocked rewards and the next recommended case.
- [ ] Today's tasks lists only "Start here" (the explainer) and "Required" (your department plus the general cases); there is no "Optional exploration" section.
- [ ] Map button shows the whole office: department rooms across the upper and middle floors along branching corridors, General and Chat vs Cowork on the right of the main corridor, and the workspace, cafeteria, lounge, print room and lobby scattered along the bottom. Every room's short name is drawn inside its rectangle; clicking a room on the map or its button in the list moves the player there (check a top-door room such as Consumer and a left-door room such as General). The department picker shows an arrow to the chosen room's door.
- [ ] Reload the page: progress and rewards are kept.

## Talking NPCs
- [ ] Walk next to any NPC (human, robot or creature; there is at least one in every room): the yellow E prompt appears above the NPC and the NPC turns to face you.
- [ ] Press E: a small speech dialog opens with the NPC's name (or Colleague / Office bot / Office critter), a portrait, one short Cowork tip and a "Source: Microsoft Learn" (or "Microsoft Adoption") link that opens the official page in a new tab. Movement is blocked while it is open.
- [ ] E, Enter, Esc, the x button or Thanks! closes the dialog and the game does not reopen it on the same key press.
- [ ] Talk to three NPCs in the same room: they give different tips. In Dutch the dialog shows "Collega" / "Bron:" / "Bedankt!" and a Dutch tip.
- [ ] Standing between a use-case desk and an NPC, E opens the scenario (desks win over NPCs).
- [ ] Debugging aid: open the site with `?debug` to get `window.__kpnGame` (`player`, `npcs`, `objects`, `map`) in the console.

## Reset
- [ ] Menu > Reset progress shows a confirmation.
- [ ] Cancel keeps all progress.
- [ ] "Yes, reset" clears completed cases and rewards; the counter returns to 0.

## Final
- [ ] Console still has no errors after all steps above.
