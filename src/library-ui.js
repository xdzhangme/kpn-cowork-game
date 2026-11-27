// Use Case Library pane, following the approved KPN landing page: search with suggestions and
// "Try:" chips, a department/role rail with more filters, active-filter chips, a count, and one
// expandable card per KPN case (see doc-card.js). Re-renders on language or progress change.
import { getLang, onLangChange } from './i18n.js';
import { isCompleted, onProgressChange } from './progress.js';
import { text } from './usecases.js';
import { buildCard } from './doc-card.js';
import { el, tr } from './doc-i18n.js';

const GROUPS = ['department', 'role', 'workload', 'scope', 'capability', 'execution'];
const PRIMARY = ['department', 'role'];
const FIXED = {
  workload: ['light', 'medium', 'heavy'],
  scope: ['personal', 'group', 'cross-team'],
  execution: ['on-demand', 'scheduled', 'automated'],
};
const TRY = ['meeting', 'report', 'email', 'budget', 'contract', 'customer'];
const slug = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Facet values of one case: { department: ['consumer'] | ['general'], role: [...], ... }.
function facetValues(c) {
  return {
    department: c.applicability?.allDepartments || !c.department ? ['general'] : [slug(c.department)],
    role: c.applicability?.allRoles || !c.roles?.length ? ['general'] : c.roles.map(slug),
    workload: c.workload ? [slug(c.workload)] : [],
    scope: c.collaborationScope ? [slug(c.collaborationScope)] : [],
    capability: (c.capabilities ?? []).map(slug),
    execution: c.executionMode ? [slug(c.executionMode)] : [],
  };
}

export function initLibraryUI(root, { useCases, hasObject = () => false, onOpenInGame }) {
  const state = { q: '', sel: Object.fromEntries(GROUPS.map((g) => [g, new Set()])) };
  let cards = [];
  let labels = {};
  let openId = null;

  const prepare = () => {
    const lang = getLang();
    labels = Object.fromEntries(GROUPS.map((g) => [g, new Map()]));
    cards = useCases.map((uc) => {
      const c = text(uc);
      const values = facetValues(c);
      values.department.forEach((id) => labels.department.set(id, c.department || tr('lib.general')));
      values.role.forEach((id, i) => labels.role.set(id, id === 'general' ? tr('lib.allRoles') : c.roles[i]));
      values.capability.forEach((id, i) => labels.capability.set(id, c.capabilities[i]));
      const searchable = [c.title, c.hook, c.situation, c.department, ...(c.roles ?? []), ...(c.capabilities ?? []),
        c.prompt?.outcome, c.why?.lead, uc.title.en, uc.hook.en].filter(Boolean).join(' ').toLowerCase();
      return { id: uc.id, uc, c, values, searchable, lang };
    });
  };

  const labelFor = (group, id) => {
    if (FIXED[group]) return tr(`value.${group}.${id}`);
    if (id === 'general') return tr(group === 'role' ? 'lib.allRoles' : 'lib.general');
    return labels[group].get(id) ?? id;
  };
  const optionIds = (group) => {
    if (FIXED[group]) return FIXED[group].filter((id) => cards.some((k) => k.values[group].includes(id)));
    const ids = [...new Set(cards.flatMap((k) => k.values[group]))];
    const general = ids.filter((id) => id === 'general');
    const rest = ids.filter((id) => id !== 'general').sort((a, b) => labelFor(group, a).localeCompare(labelFor(group, b), getLang()));
    return [...rest, ...general];
  };

  // Matching: text AND every group; capability is AND across its selection, other groups OR.
  // A "general" case applies to all departments and roles, so it matches any such selection.
  const groupMatch = (card, group, sel) => {
    if (!sel.size) return true;
    const v = card.values[group];
    if (group === 'capability') return [...sel].every((id) => v.includes(id));
    if (PRIMARY.includes(group) && v.includes('general')) return true;
    return v.some((id) => sel.has(id));
  };
  const matches = (card, except = null) =>
    (!state.q || card.searchable.includes(state.q)) &&
    GROUPS.every((g) => g === except || groupMatch(card, g, state.sel[g]));
  const countFor = (group, id) => cards.filter((k) => matches(k, group) && (k.values[group].includes(id) || (PRIMARY.includes(group) && k.values[group].includes('general')))).length;
  const availableRoles = () => {
    const depts = state.sel.department;
    const pool = depts.size ? cards.filter((k) => groupMatch(k, 'department', depts)) : cards;
    const ids = new Set(pool.flatMap((k) => k.values.role));
    return optionIds('role').filter((id) => ids.has(id));
  };

  // ---- static shell ----
  root.replaceChildren();
  const title = el('h2', { id: 'lib-title' });
  const intro = el('p', { id: 'lib-intro' });
  const searchLabel = el('label', { for: 'lib-search' });
  const search = el('input', { id: 'lib-search', type: 'search', autocomplete: 'off', 'aria-controls': 'lib-suggestions', 'aria-expanded': 'false' });
  const tryLabel = el('span', { id: 'lib-try-label' });
  const tryChips = el('span', { id: 'lib-try', class: 'chips', role: 'group', 'aria-labelledby': 'lib-try-label' });
  const suggestions = el('ul', { id: 'lib-suggestions', hidden: true, role: 'listbox' });
  const railTitle = el('h3', { class: 'vh' });
  const railToggle = el('button', { type: 'button', id: 'rail-toggle', class: 'btn secondary rail-toggle', 'aria-expanded': 'false', 'aria-controls': 'rail-body' });
  const primary = el('div', { id: 'lib-primary' });
  const more = el('div', { id: 'lib-more', class: 'more-panel', hidden: true });
  const moreToggle = el('button', { type: 'button', id: 'more-toggle', class: 'btn secondary small', 'aria-expanded': 'false', 'aria-controls': 'lib-more' });
  const railBody = el('div', { id: 'rail-body', class: 'rail-body is-collapsed' }, el('div', { class: 'facets' }, primary, more), moreToggle);
  const count = el('p', { id: 'lib-count', 'aria-live': 'polite' });
  const notice = el('p', { id: 'lib-notice', class: 'small', 'aria-live': 'polite', hidden: true });
  const chips = el('div', { id: 'lib-chips', class: 'chips', 'aria-label': tr('lib.filters') });
  const emptyTitle = el('h3');
  const emptyHelp = el('p');
  const emptyReset = el('button', { type: 'button', id: 'empty-reset', class: 'btn' });
  const empty = el('div', { id: 'lib-empty', hidden: true }, emptyTitle, emptyHelp, emptyReset);
  const results = el('div', { id: 'lib-results' });
  root.append(el('section', { id: 'library-top', 'aria-labelledby': 'lib-title' },
    el('div', { class: 'lib-head' }, title, intro),
    el('div', { class: 'lib-searchpanel' },
      el('div', { class: 'lib-search' }, searchLabel, search),
      el('p', { class: 'try-row' }, tryLabel, ' ', tryChips),
      suggestions),
    el('div', { class: 'lib-layout' },
      el('aside', { class: 'lib-rail', 'aria-labelledby': 'lib-rail-title' }, railTitle, railToggle, railBody),
      el('div', { class: 'lib-main' },
        el('div', { class: 'lib-status' }, count, notice, chips),
        empty, results))));
  railTitle.id = 'lib-rail-title';

  // ---- rendering ----
  const openState = new Set(PRIMARY);
  const buildGroup = (group) => {
    const ids = group === 'role' ? availableRoles() : optionIds(group);
    const box = el('details', { class: 'ms', 'data-group': group });
    if (openState.has(group)) box.open = true;
    box.addEventListener('toggle', () => { if (box.open) openState.add(group); else openState.delete(group); });
    const n = state.sel[group].size;
    box.append(el('summary', {}, el('span', { text: tr(`group.${group}`) }),
      el('span', { class: 'ms-count', 'aria-hidden': 'true', text: n ? String(n) : '' }),
      el('span', { class: 'vh', text: n ? tr('lib.selected', { n }) : '' })));
    const fieldset = el('fieldset', {}, el('legend', { class: 'vh', text: tr(`group.${group}`) }));
    ids.forEach((id) => {
      const input = el('input', { type: 'checkbox', value: id, 'data-group': group });
      input.checked = state.sel[group].has(id);
      fieldset.append(el('label', { class: 'ms-option' }, input, el('span', { text: labelFor(group, id) }),
        el('span', { class: 'n', 'aria-hidden': 'true', text: String(countFor(group, id)) })));
    });
    box.append(fieldset);
    return box;
  };
  const renderFacets = () => {
    primary.replaceChildren(...PRIMARY.map(buildGroup));
    more.replaceChildren(...GROUPS.filter((g) => !PRIMARY.includes(g)).map(buildGroup));
  };
  const renderChips = () => {
    const active = GROUPS.flatMap((g) => [...state.sel[g]].map((id) => ({ g, id })));
    chips.replaceChildren();
    if (state.q) active.unshift({ g: 'q', id: state.q });
    active.forEach(({ g, id }) => {
      const label = g === 'q' ? `“${id}”` : labelFor(g, id);
      const rm = el('button', { type: 'button', 'aria-label': tr('lib.removeFilter', { label }), text: '×' });
      rm.addEventListener('click', () => {
        if (g === 'q') { state.q = ''; search.value = ''; } else state.sel[g].delete(id);
        update();
      });
      chips.append(el('span', { class: 'chip' }, label, rm));
    });
    if (active.length > 1) {
      const clear = el('button', { type: 'button', class: 'link-btn', 'data-clear-all': true, text: tr('lib.clearAll') });
      clear.addEventListener('click', reset);
      chips.append(clear);
    }
  };
  const renderResults = () => {
    let shown = 0;
    cards.forEach((k) => {
      const on = matches(k);
      k.node.hidden = !on;
      if (on) shown += 1;
    });
    count.textContent = tr('lib.count', { n: shown, total: cards.length });
    empty.hidden = shown > 0;
    results.hidden = shown === 0;
  };
  const reconcileRoles = () => {
    const ok = new Set(availableRoles());
    const removed = [...state.sel.role].filter((id) => !ok.has(id));
    removed.forEach((id) => state.sel.role.delete(id));
    notice.hidden = !removed.length;
    if (removed.length) notice.textContent = tr('lib.roleCleared', { labels: removed.map((id) => labelFor('role', id)).join(', ') });
  };
  const update = () => {
    reconcileRoles();
    renderFacets();
    renderChips();
    renderResults();
  };
  function reset() {
    state.q = '';
    search.value = '';
    GROUPS.forEach((g) => state.sel[g].clear());
    update();
  }

  const openCase = (id, { scroll = true } = {}) => {
    openId = id;
    cards.forEach((k) => { k.shell.open = k.id === id; });
    const target = cards.find((k) => k.id === id);
    if (target && scroll) {
      results.style.setProperty('--case-scroll-offset', `${root.querySelector('.lib-status').getBoundingClientRect().height + 12}px`);
      target.node.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  const buildCards = () => {
    results.replaceChildren();
    cards.forEach((k) => {
      const built = buildCard(k.c, { onPlay: onOpenInGame, hasObject: hasObject(k.id), completed: isCompleted(k.id) });
      k.node = built.node;
      k.shell = built.shell;
      built.summary.addEventListener('click', (e) => {
        e.preventDefault();
        if (k.shell.open) { k.shell.open = false; openId = null; } else openCase(k.id, { scroll: false });
      });
      if (k.id === openId) k.shell.open = true;
      results.append(k.node);
    });
  };

  const renderStatic = () => {
    title.textContent = tr('lib.title');
    intro.textContent = tr('lib.intro', { total: useCases.length });
    searchLabel.textContent = tr('lib.search');
    search.placeholder = tr('lib.searchPlaceholder');
    tryLabel.textContent = tr('lib.try');
    tryChips.replaceChildren(...TRY.map((w) => {
      const b = el('button', { type: 'button', class: 'try-chip', text: w });
      b.addEventListener('click', () => { search.value = w; state.q = w; update(); search.focus(); });
      return b;
    }));
    railTitle.textContent = tr('lib.filters');
    const collapsed = railBody.classList.contains('is-collapsed');
    railToggle.textContent = tr(collapsed ? 'lib.showFilters' : 'lib.hideFilters');
    moreToggle.textContent = tr(more.hidden ? 'lib.moreFilters' : 'lib.fewerFilters');
    emptyTitle.textContent = tr('lib.emptyTitle');
    emptyHelp.textContent = tr('lib.emptyHelp');
    emptyReset.textContent = tr('lib.reset');
  };

  const renderAll = () => {
    prepare();
    renderStatic();
    buildCards();
    update();
  };

  // ---- events ----
  railToggle.addEventListener('click', () => {
    const open = railBody.classList.toggle('is-collapsed') === false;
    railToggle.setAttribute('aria-expanded', String(open));
    railToggle.textContent = tr(open ? 'lib.hideFilters' : 'lib.showFilters');
  });
  moreToggle.addEventListener('click', () => {
    more.hidden = !more.hidden;
    moreToggle.setAttribute('aria-expanded', String(!more.hidden));
    moreToggle.textContent = tr(more.hidden ? 'lib.moreFilters' : 'lib.fewerFilters');
  });
  railBody.addEventListener('change', (e) => {
    const input = e.target.closest('input[type=checkbox][data-group]');
    if (!input) return;
    const set = state.sel[input.dataset.group];
    if (input.checked) set.add(input.value); else set.delete(input.value);
    update();
  });
  emptyReset.addEventListener('click', reset);
  const hideSuggestions = () => { suggestions.hidden = true; suggestions.replaceChildren(); search.setAttribute('aria-expanded', 'false'); };
  search.addEventListener('input', () => {
    state.q = search.value.trim().toLowerCase();
    update();
    const q = state.q;
    const hits = q.length >= 2 ? cards.filter((k) => k.c.title.toLowerCase().includes(q)).slice(0, 6) : [];
    suggestions.replaceChildren(...hits.map((k) => {
      const b = el('button', { type: 'button', role: 'option', text: k.c.title });
      b.addEventListener('click', () => { hideSuggestions(); openCase(k.id); });
      return el('li', {}, b);
    }));
    suggestions.hidden = !hits.length;
    search.setAttribute('aria-expanded', String(Boolean(hits.length)));
  });
  search.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideSuggestions(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.lib-searchpanel')) hideSuggestions(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !root.closest('section')?.hidden && !/input|textarea/i.test(document.activeElement?.tagName ?? '')) {
      e.preventDefault();
      search.focus();
    }
  });

  renderAll();
  onLangChange(renderAll);
  onProgressChange(() => { buildCards(); renderResults(); });
  return { openCase, reset };
}
