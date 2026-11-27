// Rules hook: turns game input into game events, kept separate from rendering.
import { inputBlocked } from './player.js';

export const OPEN_USE_CASE = 'open-use-case';
export const TALK_NPC = 'talk-npc';

// Pressing E near an interactable emits an `open-use-case` event ({ detail: { useCaseId, objectId } })
// on the target; near an NPC (getActive() returns `{ npc }`) it emits `talk-npc` ({ detail: { npc } }).
// getActive() returns whatever is currently in range, or null.
export function initRules(target, getActive, canPlay = () => true) {
  window.addEventListener('keydown', (e) => {
    if ((e.key !== 'e' && e.key !== 'E') || e.repeat) return;
    if (e.ctrlKey || e.metaKey || e.altKey || inputBlocked() || !canPlay()) return;
    const object = getActive();
    if (!object) return;
    if (object.npc) {
      target.dispatchEvent(new CustomEvent(TALK_NPC, { detail: { npc: object.npc } }));
      return;
    }
    target.dispatchEvent(
      new CustomEvent(OPEN_USE_CASE, { detail: { useCaseId: object.useCaseId, objectId: object.id } }),
    );
  });
}
