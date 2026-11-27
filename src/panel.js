import { onLangChange, pick, t } from './i18n.js';
import { completedIds, onProgressChange, progressCounts } from './progress.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// "plant-fern" -> "Plant fern"
function rewardName(id) {
  const s = id.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Right-side game panel: progress, unlocked rewards, next recommended case and how to play.
 * Use cases themselves open in the scenario overlay (scenario.js), not here.
 * options.introSeen(): hides the "visit the intro room" nudge once the player has been there.
 */
export function initCardPanel(container, useCases, { introSeen = () => true } = {}) {
  const cases = useCases.filter((u) => u.meta.department !== 'intro');

  function render() {
    const done = new Set(completedIds());
    const counts = progressCounts(cases);
    const unlocked = cases.filter((u) => done.has(u.id) && u.rewardId);
    const next = cases.find((u) => !done.has(u.id));
    const view = el('div', 'gp-idle');
    const head = el('header', 'uc-head px-title');
    head.append(el('h3', 'uc-title', t('panel.idle.title')));
    const body = el('div', 'uc-body');
    body.append(el('p', 'gp-hint', t('panel.hint')));
    if (!introSeen()) body.append(el('p', 'gp-nudge', t('panel.intro.hint')));
    body.append(
      el('h4', 'uc-label', t('panel.progress')),
      el('p', 'gp-progress', `${counts.completed} / ${counts.total} ${t('panel.completed')}`),
      el('p', 'gp-progress', `${counts.rewards} / ${counts.total} ${t('panel.unlocked')}`),
      el('h4', 'uc-label', t('panel.rewards')),
    );
    if (unlocked.length) {
      const list = el('ul', 'gp-rewards');
      unlocked.forEach((u) => list.append(el('li', '', rewardName(u.rewardId))));
      body.append(list);
    } else {
      body.append(el('p', 'placeholder', t('panel.rewards.none')));
    }
    body.append(el('h4', 'uc-label', t('panel.next')));
    body.append(next ? el('p', 'gp-next', `${next.id} · ${pick(next.title)}`) : el('p', 'placeholder', t('panel.next.none')));
    view.append(head, body);
    container.replaceChildren(view);
  }

  onLangChange(render);
  onProgressChange(render);
  render();
  return { refresh: render };
}
