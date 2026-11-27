// Talking NPCs: a small pixel speech dialog in which an NPC gives one Cowork usage tip.
// Tips are paraphrased from official Microsoft documentation (src/data/npc-tips.json), each with
// its source URL. Assignment is deterministic by NPC index, so neighbours never share a tip
// (at most six NPCs per room, 43 tips); an NPC may pin a specific tip with a `tip` id.
import { npcSprite } from './art/npc-sprites.js';
import { getLang, t } from './i18n.js';
import { TALK_NPC } from './rules.js';
import tipData from './data/npc-tips.json';

export const TIPS = tipData.tips;
const SCALE = 4;

export function tipFor(npc) {
  const pinned = npc.def.tip ? TIPS.findIndex((tip) => tip.id === npc.def.tip) : -1;
  return TIPS[(pinned >= 0 ? pinned : npc.index) % TIPS.length];
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function portrait(npc) {
  const { canvas, w, h } = npcSprite(npc.def, npc.facing, 0);
  const out = document.createElement('canvas');
  out.width = w * SCALE;
  out.height = h * SCALE;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, w, h, 0, 0, out.width, out.height);
  out.className = 'npc-talk-sprite';
  out.setAttribute('aria-hidden', 'true');
  return out;
}

// Builds the dialog once and opens it on `talk-npc` events dispatched on `target`.
export function initNpcTalk(target = window) {
  const dlg = el('dialog', 'px-dialog px-panel px-dialog--npc');
  dlg.id = 'npc-dialog';
  const head = el('header', 'px-dialog-head px-title');
  const title = el('h2', 'px-dialog-title');
  const close = el('button', 'px-btn px-dialog-x', '×');
  close.type = 'button';
  close.addEventListener('click', () => dlg.close());
  head.append(title, close);
  const body = el('div', 'px-dialog-body npc-talk');
  const figure = el('div', 'npc-talk-portrait');
  const bubble = el('div', 'npc-talk-bubble');
  const text = el('p', 'npc-talk-text');
  const source = el('p', 'npc-talk-source');
  const sourceLabel = el('span', '', '');
  const sourceLink = el('a', 'npc-talk-link');
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  source.append(sourceLabel, ' ', sourceLink);
  bubble.append(text, source);
  body.append(figure, bubble);
  const foot = el('div', 'px-dialog-foot');
  const ok = el('button', 'px-btn px-btn--primary');
  ok.type = 'button';
  ok.addEventListener('click', () => dlg.close());
  foot.append(ok);
  body.append(foot);
  dlg.append(head, body);
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  // E or Enter closes the dialog, so a second press of the talk key dismisses it.
  dlg.addEventListener('keydown', (e) => {
    if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      e.stopPropagation(); // otherwise the window-level talk rule would reopen it at once
      dlg.close();
    }
  });
  document.body.append(dlg);

  let current = null;

  function open(npc) {
    current = npc;
    const tip = tipFor(npc);
    const lang = getLang();
    const name = npc.def.name?.[lang] ?? npc.def.name?.en ?? t(`npc.name.${npc.def.kind}`);
    title.textContent = name;
    close.setAttribute('aria-label', t('dialog.close'));
    figure.replaceChildren(portrait(npc));
    text.textContent = tip[lang] ?? tip.en;
    sourceLabel.textContent = t('npc.source');
    sourceLink.textContent = tip.sourceSite;
    sourceLink.href = tip.source;
    sourceLink.title = tip.sourceTitle;
    ok.textContent = t('npc.thanks');
    dlg.dataset.tip = tip.id;
    dlg.dataset.npc = npc.def.id;
    if (!dlg.open) dlg.showModal();
    ok.focus();
  }

  target.addEventListener(TALK_NPC, (e) => open(e.detail.npc));
  return { open, dialog: dlg, current: () => current };
}
