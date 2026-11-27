// Builds one Use Case Library card from a KPN case record, following the approved landing page's
// card markup (header strip, prompt, safety, "See it run" dialog, Fit form, How it works, Why Cowork).
// Credits are never shown. Everything is driven by the KPN JSON; nothing is invented here.
import { config } from './config.js';
import { copyWithFeedback, el, svg, tr, withMarks } from './doc-i18n.js';

const HERO_ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 5a3.5 3.5 0 010 7M18 15c2 .6 3.5 2.2 3.5 5"/>',
  spark: '<path d="M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7z"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
  checklist: '<path d="M4 6l2 2 3-3M4 14l2 2 3-3M12 7h8M12 15h8"/>',
  document: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const STRIP_ICONS = {
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/>',
  people: HERO_ICONS.people,
  box: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.1L12 17l-5.5 3 1-6.1L3 9.5l6.3-.9z"/>',
};

const PROMPT_PARTS = ['outcome', 'inputs', 'doneWhen', 'constraints', 'approval'];
const stripRow = (icon, label, value) =>
  el('span', { html: svg(STRIP_ICONS[icon], 16) }, document.createTextNode(` ${label} `), el('b', { text: value }));

const valueLabel = (group, raw) => {
  const key = `value.${group}.${String(raw).toLowerCase()}`;
  const label = tr(key);
  return label === key ? raw : label;
};

// Plain-text version of the prompt (used by Copy prompt).
export function promptText(c) {
  return PROMPT_PARTS.filter((p) => c.prompt?.[p]).map((p) => `${tr(`card.part.${p}`)} ${c.prompt[p]}`).join('\n');
}

function buildPromptPre(c, cls = 'prompt orig') {
  const pre = el('pre', { class: cls });
  PROMPT_PARTS.forEach((p, i) => {
    if (!c.prompt?.[p]) return;
    if (pre.childNodes.length) pre.append('\n');
    pre.append(el('b', { class: `p${i}`, text: tr(`card.part.${p}`) }), ' ', withMarks(c.prompt[p]));
  });
  return pre;
}

function buildHeader(c, { completed }) {
  const dept = c.department || tr('lib.general');
  const roles = c.applicability?.allRoles ? tr('lib.allRoles') : (c.roles ?? []).join(', ');
  const header = el('header', {},
    el('div', { class: 'hero' },
      el('span', { class: 'hero-ic', html: svg(HERO_ICONS[c.icon] ?? HERO_ICONS.document, 28) }),
      el('h2', { id: `${c.id}-t`, text: c.title }),
      el('p', { class: 'hook', text: c.hook }),
    ),
    el('div', { class: 'strip', 'aria-label': tr('card.strip') },
      el('div', { class: 'strip-row' },
        stripRow('box', tr('card.department'), dept),
        stripRow('person', tr('card.role'), roles),
        stripRow('star', tr('card.workload'), valueLabel('workload', c.workload)),
      ),
      el('div', { class: 'strip-row' },
        stripRow('plus', tr('card.execution'), valueLabel('execution', c.executionMode)),
        stripRow('box', tr('card.capability'), (c.capabilities ?? []).join(', ')),
        stripRow('people', tr('card.scope'), valueLabel('scope', c.collaborationScope)),
      ),
    ),
  );
  if (completed) header.querySelector('.hero').append(el('span', { class: 'case-lang-mark done-mark', text: tr('lib.completed') }));
  return header;
}

function buildPromptSection(c, actions) {
  const copyBtn = el('button', { type: 'button', class: 'btn copy-orig', text: tr('card.copy') });
  copyBtn.addEventListener('click', () => copyWithFeedback(copyBtn, promptText(c), tr('card.copied'), tr('card.copy')));
  const row = el('div', { class: 'row' }, copyBtn,
    el('a', { class: 'btn', href: config.coworkUrl, target: '_blank', rel: 'noopener', text: tr('card.try') }));
  if (actions.onPlay) {
    const play = el('button', { type: 'button', class: 'btn primary game-link', text: tr('card.play') });
    if (!actions.hasObject) {
      play.disabled = true;
      play.title = tr('card.noObject');
    }
    play.addEventListener('click', () => actions.onPlay(c.id));
    row.append(play);
  }
  const sources = el('ul', { class: 'source-list' }, ...(c.safety?.sources ?? []).map((s) =>
    el('li', {}, el('strong', { text: s.name }), `: ${s.detail}`)));
  return el('section', { class: 'section', 'aria-labelledby': `${c.id}-p` },
    el('h3', { id: `${c.id}-p` }, el('span', { class: 'step-n', text: '1' }), tr('card.prompt')),
    el('p', { class: 'sub', text: c.situation }),
    buildPromptPre(c),
    el('p', { class: 'hl-note' }, withMarks(tr('card.hlNote'))),
    el('dl', { class: 'safety' },
      el('div', {}, el('dt', { text: tr('card.sources') }), el('dd', {}, sources)),
      el('div', {}, el('dt', { text: tr('card.youApprove') }), el('dd', { text: c.safety?.approve ?? '' })),
    ),
    row,
  );
}

function buildRunDialog(c) {
  const run = c.run ?? {};
  const checks = [1, 2, 3, 4].map((n) => tr(`card.run.check${n}`));
  const steps = el('ol', { class: 'steps' }, ...(run.steps ?? []).map((s) =>
    el('li', {}, el('span', { class: s.pause ? 'ic pause' : 'ic', text: s.pause ? '!' : '✓' }),
      el('div', {}, s.text, s.note ? el('small', { text: ` ${s.note}` }) : null))));
  const good = run.good ?? {};
  const goodPanel = el('div', { class: 'tabpanel', 'data-t': 'good' },
    el('span', { class: 'verdict good', text: tr('card.run.good') }),
    el('div', { class: 'answer good' },
      el('p', {}, el('b', { text: good.title ?? '' }), ` ${tr('card.run.proposed')}`),
      el('ul', {}, ...(good.items ?? []).map((it) => el('li', {}, `${it.text} `, it.src ? el('span', { class: 'src', text: it.src }) : null))),
      good.gap ? el('p', {}, el('b', { text: tr('card.run.gap') }), ` ${good.gap}`) : null,
      good.notTouched ? el('p', {}, el('b', { text: tr('card.run.notTouched') }), ` ${good.notTouched}`) : null,
      good.ask ? el('p', { text: good.ask }) : null,
    ),
    good.why ? el('p', { class: 'sub', style: 'margin-top:.6rem' }, el('b', { text: tr('card.run.whyGood') }), ` ${good.why}`) : null,
  );
  const checkPanel = el('div', { class: 'tabpanel', 'data-t': 'check', hidden: true },
    el('p', { class: 'sub', text: tr('card.run.checksIntro') }),
    el('ol', { class: 'check' }, ...checks.map((q, i) =>
      el('li', {}, el('span', { class: 'n', text: String(i + 1) }), el('div', {}, el('b', { text: q }), run.checks?.[i] ?? '')))),
  );
  const bad = run.bad ?? {};
  const flags = (bad.segments ?? []).filter((s) => typeof s === 'object').length;
  const badP = el('p', {});
  (bad.segments ?? []).forEach((s) => {
    if (typeof s === 'string') badP.append(s);
    else badP.append(el('button', { type: 'button', class: 'flag', 'data-w': String(s.flag), text: s.text }));
  });
  const prog = el('p', { class: 'progress prog', text: tr('card.run.found', { n: 0, m: flags }) });
  const reveal = el('button', { type: 'button', class: 'btn reveal', text: tr('card.run.reveal', { m: flags }) });
  const badPanel = el('div', { class: 'tabpanel', 'data-t': 'bad', hidden: true },
    el('span', { class: 'verdict bad', text: tr('card.run.weak') }),
    el('p', { class: 'sub', text: tr('card.run.badIntro') }),
    el('div', { class: 'answer bad' }, badP, ...(bad.reasons ?? []).map((r, i) => el('p', { class: 'why', 'data-w': String(i + 1), text: r }))),
    prog, reveal,
  );
  const tabs = el('div', { class: 'tabs', role: 'tablist' }, ...['good', 'check', 'bad'].map((t, i) =>
    el('button', { type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(i === 0), 'data-t': t, text: tr(`card.run.${t}`) })));
  const result = el('div', { class: 'pane right result', 'aria-label': tr('card.run.result') }, tabs, goodPanel, checkPanel, badPanel);
  const closeBtn = el('button', { type: 'button', class: 'btn close-run', text: tr('card.run.close') });
  const dialog = el('dialog', { 'aria-labelledby': `${c.id}-run` },
    el('div', { class: 'cw' },
      el('div', { class: 'cw-top' },
        el('strong', { id: `${c.id}-run` }, 'Cowork ', el('span', { class: 'sim', text: tr('card.run.sim') })),
        closeBtn),
      el('div', { class: 'cw-body' },
        el('div', { class: 'pane left', 'aria-label': tr('card.run.conversation') },
          el('div', { class: 'bubble me' }, el('small', { text: tr('card.run.you') }), run.userMsg ?? ''),
          el('div', { class: 'bubble' }, el('small', { text: tr('card.run.cowork') }), run.coworkMsg ?? ''),
          steps),
        result)));

  let timers = [];
  const play = () => {
    timers.forEach(clearTimeout);
    timers = [];
    const items = [...steps.children];
    items.forEach((li) => li.classList.remove('show'));
    result.classList.remove('show');
    items.forEach((li, i) => timers.push(setTimeout(() => li.classList.add('show'), 500 + i * 650)));
    timers.push(setTimeout(() => result.classList.add('show'), 500 + items.length * 650));
  };
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { timers.forEach(clearTimeout); });
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    tabs.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    result.querySelectorAll('.tabpanel').forEach((p) => { p.hidden = p.dataset.t !== btn.dataset.t; });
  });
  const found = new Set();
  const update = () => { prog.textContent = tr('card.run.found', { n: found.size, m: flags }); };
  badPanel.addEventListener('click', (e) => {
    const flag = e.target.closest('.flag');
    if (!flag) return;
    flag.classList.add('found');
    found.add(flag.dataset.w);
    badPanel.querySelector(`.why[data-w="${flag.dataset.w}"]`)?.classList.add('show');
    update();
  });
  reveal.addEventListener('click', () => {
    badPanel.querySelectorAll('.flag').forEach((f) => { f.classList.add('found'); found.add(f.dataset.w); });
    badPanel.querySelectorAll('.why').forEach((w) => w.classList.add('show'));
    update();
  });
  return { dialog, play };
}

function buildRunSection(c, dialogApi) {
  const open = el('button', { type: 'button', class: 'btn primary open-run', text: tr('card.run.open') });
  open.addEventListener('click', () => {
    dialogApi.dialog.showModal();
    dialogApi.play();
  });
  return el('section', { class: 'section', 'aria-labelledby': `${c.id}-r` },
    el('h3', { id: `${c.id}-r` }, el('span', { class: 'step-n', text: '2' }), tr('card.run.h')),
    open);
}

// "Fit it into your work": the KPN `fit.fields` and `fit.chips` replace brackets in the prompt locally.
function buildFitFold(c) {
  const fit = c.fit ?? {};
  const fields = fit.fields ?? [];
  const chips = fit.chips ?? [];
  const inputs = fields.map((f, i) =>
    el('label', {}, `${f.label} `, el('span', { class: 'hint', text: f.hint ?? '' }),
      el('input', { class: `f-field-${i}`, placeholder: String(f.bracket ?? '').replace(/^\[|\]$/g, '') })));
  const chipState = chips.map((ch) => ch.default ?? 0);
  const chipRows = chips.map((ch, ci) =>
    el('div', { class: 'chip-row' }, el('span', { class: 'note', text: ch.label }),
      el('div', { class: 'seg', role: 'group', 'aria-label': ch.label }, ...ch.options.map((o, oi) => {
        const b = el('button', { type: 'button', 'data-c': String(ci), 'data-o': String(oi), 'aria-pressed': String(oi === chipState[ci]), text: o.label });
        return b;
      }))));
  const own = el('textarea', { class: 'f-own', rows: '2', placeholder: fit.ownPlaceholder ?? '' });
  const fitted = el('pre', { class: 'prompt fitted', 'aria-label': tr('card.fit.out'), 'aria-live': 'polite' });
  const copyFit = el('button', { type: 'button', class: 'btn primary copy-fit', text: tr('card.fit.copy') });
  const msg = el('span', { class: 'note fit-msg' });
  const body = el('div', { class: 'fold-body' },
    el('p', { class: 'sub', text: tr('card.fit.intro') }),
    el('div', { class: 'fit' },
      el('div', { class: 'grid2' }, ...inputs),
      ...chipRows,
      el('label', {}, `${tr('card.fit.own')} `, el('span', { class: 'hint', text: tr('card.fit.ownHint') }), own),
      el('div', { class: 'out' }, el('p', { class: 'note', text: tr('card.fit.out') }), fitted,
        el('div', { class: 'row' }, copyFit, msg))));

  const render = () => {
    const parts = PROMPT_PARTS.filter((p) => c.prompt?.[p]).map((p) => {
      let s = c.prompt[p];
      fields.forEach((f, i) => {
        const v = inputs[i].querySelector('input').value.trim();
        if (v && f.bracket) s = s.split(f.bracket).join(v);
      });
      chips.forEach((ch, ci) => {
        const v = ch.options[chipState[ci]]?.value;
        if (v != null && ch.bracket) s = s.split(ch.bracket).join(v);
      });
      return { p, s };
    });
    const ownText = own.value.trim();
    fitted.replaceChildren();
    parts.forEach(({ p, s }, i) => {
      if (ownText && p === 'constraints') fitted.append(`${tr('card.fit.aboutMine')} ${ownText}\n`);
      if (i) fitted.append('\n');
      fitted.append(el('b', { class: `p${PROMPT_PARTS.indexOf(p)}`, text: tr(`card.part.${p}`) }), ' ', withMarks(s));
    });
    if (ownText && !parts.some(({ p }) => p === 'constraints')) fitted.append(`\n${tr('card.fit.aboutMine')} ${ownText}`);
    const left = fitted.querySelectorAll('mark').length;
    msg.textContent = tr('card.fit.left', { n: left });
  };
  body.addEventListener('input', render);
  body.addEventListener('click', (e) => {
    const b = e.target.closest('.seg button[data-c]');
    if (!b) return;
    chipState[Number(b.dataset.c)] = Number(b.dataset.o);
    b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });
  copyFit.addEventListener('click', () => copyWithFeedback(copyFit, fitted.textContent, tr('card.copied'), tr('card.fit.copy')));
  render();
  return el('details', { class: 'fold' },
    el('summary', {}, el('span', { class: 'step-n', text: '3' }), el('span', {}, tr('card.fit.h'), ' ', el('small', { text: tr('card.fit.sub') }))),
    body);
}

function buildHowFold(c) {
  const how = c.how ?? {};
  return el('details', { class: 'fold how-fold' },
    el('summary', {}, el('span', { class: 'step-n', text: '4' }), el('span', {}, tr('card.how.h'), ' ', el('small', { text: tr('card.how.sub') }))),
    el('div', { class: 'fold-body' },
      how.intro ? el('p', { class: 'sub', text: how.intro }) : null,
      el('h4', { text: tr('card.how.own') }),
      el('dl', {},
        el('dt', { text: tr('card.how.tailor') }), el('dd', { text: how.tailor ?? '' }),
        el('dt', { text: tr('card.how.variation') }), el('dd', { text: how.variation ?? '' })),
      how.also?.length ? el('h4', { text: tr('card.how.also') }) : null,
      how.also?.length ? el('ul', {}, ...how.also.map((a) => el('li', { text: a }))) : null,
      el('h4', { text: tr('card.how.ideas') }),
      el('dl', {},
        el('dt', { text: tr('card.how.skill') }), el('dd', {}, how.skill?.name ? el('b', { text: `${how.skill.name}: ` }) : null, how.skill?.text ?? ''),
        el('dt', { text: tr('card.how.automation') }), el('dd', {}, how.automation?.title ? el('b', { text: `${how.automation.title}: ` }) : null, how.automation?.text ?? '')),
      el('p', { class: 'sub', text: tr('card.how.note') })));
}

// "Why Cowork": the Chat / Cowork toggle with the case's three lines and verdict per mode.
function buildWhySection(c) {
  const why = c.why ?? {};
  const list = el('ul', { class: 'why-list' });
  const verdict = el('p', { class: 'verdict why-verdict', 'aria-live': 'polite' });
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': tr('card.why.label') },
    el('button', { type: 'button', 'aria-pressed': 'true', 'data-m': 'chat', text: tr('card.why.chat') }),
    el('button', { type: 'button', 'aria-pressed': 'false', 'data-m': 'cowork', text: tr('card.why.cowork') }));
  const section = el('section', { class: 'why-cw', 'data-m': 'chat', 'aria-labelledby': `${c.id}-why` },
    el('h3', { id: `${c.id}-why`, text: tr('card.why.h') }),
    el('p', { class: 'why-lead', text: why.lead ?? '' }),
    seg, list, verdict,
    el('p', { class: 'small', text: tr('card.why.small') }));
  const setMode = (m) => {
    section.dataset.m = m;
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
    const items = m === 'chat' ? why.chat ?? [] : why.cowork ?? [];
    list.replaceChildren(...items.map((t) => el('li', {}, el('span', { class: 'dot', text: m === 'chat' ? '·' : '✓' }), ' ', t)));
    verdict.textContent = m === 'chat' ? why.chatVerdict ?? '' : why.coworkVerdict ?? '';
  };
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-m]');
    if (b) setMode(b.dataset.m);
  });
  setMode('chat');
  return section;
}

// Returns the `article.card` node. `actions`: { onPlay(id), hasObject, completed }.
export function buildCard(c, actions = {}) {
  const runApi = buildRunDialog(c);
  const header = buildHeader(c, actions);
  const body = el('div', { class: 'gallery-case-body' },
    buildPromptSection(c, actions),
    buildRunSection(c, runApi),
    buildFitFold(c),
    buildHowFold(c),
    buildWhySection(c),
    runApi.dialog);
  const summary = el('summary', { class: 'case-summary' }, header);
  const shell = el('details', { class: 'gallery-case', name: 'gallery-cases' }, summary, body);
  const article = el('article', { class: 'card', id: c.id, 'aria-labelledby': `${c.id}-t` }, shell);
  return { node: article, shell, summary };
}
