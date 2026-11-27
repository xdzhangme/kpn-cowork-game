// "Responsible AI" pane, following the approved KPN landing page's governance pane:
// grouped tiles (Data, Oversight, Region and cost, Limits), tenant-setting chips and a banner.
import { onLangChange } from './i18n.js';
import { el, svg, tr } from './doc-i18n.js';

const GROUPS = [
  ['data', ['inside', 'rights', 'labels', 'training']],
  ['oversight', ['trace', 'approve', 'ext']],
  ['region', ['eu', 'cost']],
  ['limits', ['gaps']],
];
// Tenant settings shown as chips; both are off until an admin enables them.
const CHIPS = { eu: ['claude', 'off'], approve: ['browser', 'off'] };
const WARNING = svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18.5v.5"/>', 28);

export function initGovernancePane(root) {
  const render = () => {
    const groups = GROUPS.map(([g, ids]) => el('section', { class: 'gv-group', 'data-group': g, 'aria-labelledby': `gv-g-${g}` },
      el('h3', { id: `gv-g-${g}`, text: tr(`gov.group.${g}`) }),
      el('div', { class: 'gv-grid' }, ...ids.map((id) => {
        const tile = el('article', { class: 'gv-tile', id: `gv-${id}` },
          el('h4', { text: tr(`gov.item.${id}.t`) }), el('p', { text: tr(`gov.item.${id}.b`) }));
        if (CHIPS[id]) {
          const [chip, state] = CHIPS[id];
          tile.append(el('div', { class: 'gv-chips' },
            el('span', { class: 'gv-chip', 'data-chip': chip, 'data-state': state }, el('span', { class: 'dot', 'aria-hidden': 'true' }), tr(`gov.chip.${chip}.${state}`))));
        }
        return tile;
      }))));
    root.replaceChildren(
      el('div', { class: 'pane gv kpn-doc' },
        el('h2', { class: 'gv-title', text: tr('gov.title') }),
        el('p', { class: 'gv-lead', text: tr('gov.lead') }),
        el('div', { id: 'gv-groups' }, ...groups),
        el('aside', { class: 'gv-banner', role: 'note' },
          el('span', { class: 'gv-banner-ic', html: WARNING }),
          el('div', {}, el('h3', { text: tr('gov.banner.title') }), el('p', { text: tr('gov.banner.body') })))));
  };
  render();
  onLangChange(render);
}
