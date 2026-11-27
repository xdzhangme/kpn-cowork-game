import { renderCard } from './card.js';
import { onLangChange, pick, t } from './i18n.js';
import { isCompleted, onProgressChange } from './progress.js';

const DEPTS = ['general', 'con', 'sme', 'tso', 'lce', 'noi', 'who', 'pla', 'fin'];

// Use Case Library tab: every KPN case as a card with a department filter and a text search.
// options.onOpenInGame(id) returns false when the case has no map object; hasObject(id) tells up front.
export function initLibrary(container, { useCases, onOpenInGame, hasObject = () => true } = {}) {
  let dept = 'all';
  let query = '';

  function playButton(uc) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-btn px-btn--primary';
    btn.textContent = t('card.play');
    const note = document.createElement('p');
    note.className = 'placeholder uc-note';
    note.setAttribute('role', 'status');
    btn.addEventListener('click', () => {
      if (hasObject(uc.id) && onOpenInGame?.(uc.id)) return;
      note.textContent = t('card.noObject');
    });
    return [btn, note];
  }

  function matches(uc) {
    if (dept !== 'all' && uc.meta.department !== dept) return false;
    if (!query) return true;
    const hay = `${uc.id} ${pick(uc.title)} ${pick(uc.hook)}`.toLowerCase();
    return hay.includes(query);
  }

  function toolbar() {
    const bar = document.createElement('div');
    bar.className = 'lib-toolbar';
    const select = document.createElement('select');
    select.className = 'px-select';
    select.setAttribute('aria-label', t('library.filter.all'));
    const all = new Option(t('library.filter.all'), 'all');
    select.append(all);
    DEPTS.forEach((d) => select.append(new Option(t(`dept.${d}`), d)));
    select.value = dept;
    select.addEventListener('change', () => {
      dept = select.value;
      renderList();
    });
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'px-input';
    search.placeholder = t('library.search');
    search.setAttribute('aria-label', t('library.search'));
    search.value = query;
    search.addEventListener('input', () => {
      query = search.value.trim().toLowerCase();
      renderList();
    });
    bar.append(select, search);
    return bar;
  }

  let list;
  function renderList() {
    list.replaceChildren();
    const shown = useCases.filter(matches);
    if (!shown.length) {
      const empty = document.createElement('p');
      empty.className = 'placeholder';
      empty.textContent = t('library.empty');
      list.append(empty);
      return;
    }
    shown.forEach((uc) => {
      const [btn, note] = playButton(uc);
      const card = renderCard(uc, { actions: [btn] });
      if (isCompleted(uc.id)) card.classList.add('is-done');
      card.querySelector('.uc-actions').after(note);
      list.append(card);
    });
  }

  function render() {
    container.replaceChildren();
    list = document.createElement('div');
    list.className = 'uc-list';
    container.append(toolbar(), list);
    renderList();
  }
  render();
  onLangChange(render);
  onProgressChange(() => list && renderList());
}
