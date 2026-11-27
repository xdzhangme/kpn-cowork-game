# Manual smoke checklist

Run against the deployed GitHub Pages site (or `npm run preview`) in a desktop browser. Open the developer console first and keep it visible.

## Load
- [ ] On first visit a department picker appears, followed by the six-screen "How to play" guide (movement and E, yellow bubbles, the four acts, the Chat vs Cowork room, progress, taking a prompt to work). Next walks through it; the last button reads "Start playing"; Esc or x closes it at any time.
- [ ] The guide can be reopened with the green Guide button in the header (also from other tabs; it switches to the game) and with How to play in the bottom bar. It always restarts at screen 1.
- [ ] Page loads with no errors or warnings in the console.
- [ ] Header shows the KPN logo, "Cowork tutorial game", the Guide button and the Disclaimer button; fonts render as pixel/legible fonts (no fallback serif). The browser tab title is "KPN Cowork game".
- [ ] The office map renders on the canvas and the player is visible. Room signs read Consumer, Business SME, Tailored Solutions, Business LCE, Network Ops & IT, Wholesale, People & Learning, Finance & Control, General and Chat vs Cowork.

## Tabs
- [ ] Four tabs are present: Tutorial Game, Use Case Library, How to start, Responsible AI.
- [ ] Clicking each tab shows only its panel; the selected tab is highlighted.
- [ ] How to start shows the five Play / Copy / Run / Review / Share steps (consistent with the guide); Responsible AI shows its steps and text.
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
- [ ] The Use Case Library lists 50 cases; the department filter and the search box narrow the list; no credits are shown anywhere.
- [ ] Completed cases are marked as done.
- [ ] "Play scenario" on a card opens the Tutorial Game tab with the scenario player for that case.

## Game loop
- [ ] Move with arrow keys / WASD; the player cannot walk through walls or furniture.
- [ ] Tasks panel shows progress, unlocked rewards and the next recommended case.
- [ ] Map button shows the office map; the department picker shows an arrow to the chosen room.
- [ ] Reload the page: progress and rewards are kept.

## Reset
- [ ] Menu > Reset progress shows a confirmation.
- [ ] Cancel keeps all progress.
- [ ] "Yes, reset" clears completed cases and rewards; the counter returns to 0.

## Final
- [ ] Console still has no errors after all steps above.
