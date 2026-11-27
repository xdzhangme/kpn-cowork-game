// Loads the KPN use case library (public/data/kpn-use-cases-{en,nl}.json) at runtime and adapts
// each case into the shape the game uses. The KPN JSON files are the source of truth and are never
// edited; `scenario-overrides.json` adds optional hand-polished scenario content per case id.
import { getLang } from './i18n.js';
import overrides from './data/scenario-overrides.json';

export const LANG_FILES = { en: 'data/kpn-use-cases-en.json', nl: 'data/kpn-use-cases-nl.json' };

// Department code (prefix of the case id) -> room dept id. GEN cases go to the general room.
export const DEPT_BY_CODE = { CON: 'con', SME: 'sme', TSO: 'tso', LCE: 'lce', NOI: 'noi', WHO: 'who', PLA: 'pla', FIN: 'fin', GEN: 'general' };

// One reward sprite per case, assigned in a fixed rotation so every case unlocks a visible item.
const REWARDS = ['plant-fern', 'poster-welcome', 'desk-lamp', 'coffee-machine', 'armchair', 'rug', 'clock', 'bookshelf', 'fridge', 'water-cooler', 'frame', 'cactus'];

export const deptCode = (id) => String(id).split('-')[0].toUpperCase();

// Merges the EN and NL arrays (same ids, same order) into one list of bilingual cases.
// Language-neutral fields are lifted to the top level; the per-language KPN records stay under `en` / `nl`.
export function adaptUseCases(enList, nlList = []) {
  const nlById = new Map(nlList.map((c) => [c.id, c]));
  return enList.map((en, i) => {
    const nl = nlById.get(en.id) ?? en;
    const code = deptCode(en.id);
    return {
      id: en.id,
      icon: en.icon,
      rewardId: REWARDS[i % REWARDS.length],
      capabilities: en.capabilities ?? [],
      workload: en.workload,
      executionMode: en.executionMode,
      collaborationScope: en.collaborationScope,
      meta: { department: DEPT_BY_CODE[code] ?? 'general', code },
      title: { en: en.title, nl: nl.title },
      hook: { en: en.hook, nl: nl.hook },
      en,
      nl,
      overrides: overrides[en.id] ?? null,
    };
  });
}

// The KPN record for the current language (falls back to English).
export const text = (uc) => uc[getLang()] ?? uc.en;

// Hand-polished scenario content for the current language, or English, or null.
export const polish = (uc) => uc.overrides?.[getLang()] ?? uc.overrides?.en ?? null;

async function fetchJson(path) {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

// Fetches both language files in parallel. A missing NL file falls back to English content.
export async function loadUseCases() {
  const en = await fetchJson(LANG_FILES.en);
  let nl = [];
  try {
    nl = await fetchJson(LANG_FILES.nl);
  } catch (e) {
    console.warn(`Dutch use cases unavailable, falling back to English: ${e.message}`);
  }
  return adaptUseCases(en, nl);
}
