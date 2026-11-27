import { config } from './config.js';
import { pick, t } from './i18n.js';
import { text } from './usecases.js';
import { fullPrompt } from './scenario.js';

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function chip(label, variant) {
  return el('span', variant ? `uc-chip uc-chip--${variant}` : 'uc-chip', label);
}

// [Square bracket] placeholders become highlighted <mark> elements.
function promptBlock(s) {
  const block = el('p', 'uc-prompt');
  String(s ?? '')
    .split(/(\[[^\]]+\])/)
    .forEach((part) => {
      if (/^\[[^\]]+\]$/.test(part)) block.append(el('mark', 'uc-fill', part));
      else if (part) block.append(part);
    });
  return block;
}

function section(title, ...body) {
  const details = el('details', 'uc-section');
  details.append(el('summary', '', title), ...body);
  return details;
}

function labelled(key, value) {
  const row = el('div', 'uc-row');
  row.append(el('b', 'uc-label', t(key)), promptBlock(value));
  return row;
}

/**
 * Library card for one KPN use case in the current language. Rebuild on language change.
 * options.actions: extra buttons appended to the button row (e.g. "Play scenario").
 */
export function renderCard(useCase, { actions = [] } = {}) {
  const d = text(useCase);
  const card = el('article', 'uc-card px-panel');
  card.dataset.id = useCase.id;

  const head = el('header', 'uc-head px-title');
  head.append(el('span', 'uc-case-id', useCase.id), el('h3', 'uc-title', pick(useCase.title)));

  const body = el('div', 'uc-body');
  const chips = el('div', 'uc-chips');
  chips.append(chip(t(`dept.${useCase.meta.department}`)));
  if (useCase.workload) chips.append(chip(t(`chip.workload.${useCase.workload.toLowerCase()}`), 'mark'));
  if (useCase.collaborationScope) chips.append(chip(t(`chip.scope.${useCase.collaborationScope.toLowerCase()}`), 'alt'));
  (useCase.capabilities ?? []).forEach((c) => chips.append(chip(c, 'alt')));

  const copyBtn = el('button', 'px-btn', t('card.copy'));
  copyBtn.type = 'button';
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(fullPrompt(useCase));
      copyBtn.textContent = t('card.copied');
      setTimeout(() => (copyBtn.textContent = t('card.copy')), 1200);
    } catch {
      // Clipboard unavailable: the prompt stays selectable on screen.
    }
  });
  const tryLink = el('a', 'px-btn', t('card.try'));
  tryLink.href = config.coworkUrl;
  tryLink.target = '_blank';
  tryLink.rel = 'noopener noreferrer';
  const buttons = el('div', 'uc-actions');
  buttons.append(...actions, copyBtn, tryLink);

  const p = d.prompt ?? {};
  const promptBody = el('div', 'uc-prompt-rows');
  [['card.outcome', p.outcome], ['card.inputs', p.inputs], ['card.doneWhen', p.doneWhen], ['card.constraints', p.constraints], ['card.approval', p.approval]]
    .filter(([, v]) => v)
    .forEach(([k, v]) => promptBody.append(labelled(k, v)));

  const steps = el('ol', 'uc-steps');
  (d.run?.steps ?? []).forEach((s) => steps.append(el('li', s.pause ? 'uc-step--pause' : '', s.text)));

  const why = d.why ?? {};
  const whyBody = el('div', 'uc-why');
  if (why.lead) whyBody.append(el('p', '', why.lead));
  const cols = el('div', 'uc-why-cols');
  const col = (titleKey, items, verdict, cls) => {
    const c = el('div', `uc-why-col ${cls}`);
    c.append(el('b', '', t(titleKey)));
    const ul = el('ul');
    (items ?? []).forEach((x) => ul.append(el('li', '', x)));
    c.append(ul);
    if (verdict) c.append(el('p', 'uc-verdict', verdict));
    return c;
  };
  cols.append(col('sc.compare.chat', why.chat, why.chatVerdict, 'uc-why-col--chat'), col('sc.compare.cowork', why.cowork, why.coworkVerdict, 'uc-why-col--cowork'));
  whyBody.append(cols);

  const roles = (d.roles ?? []).join(' · ');
  body.append(el('p', 'uc-summary', pick(useCase.hook)), chips);
  if (roles) body.append(el('p', 'uc-roles', `${t('card.roles')}: ${roles}`));
  body.append(
    buttons,
    section(t('card.situation'), el('p', '', d.situation ?? '')),
    section(t('card.prompt'), promptBody),
    section(t('card.run'), steps),
    section(t('card.fit'), el('p', '', d.fit?.ownPlaceholder ?? ''), el('p', '', d.how?.tailor ?? '')),
    section(t('card.how'), el('p', '', d.how?.intro ?? ''), el('p', '', d.how?.variation ?? '')),
    section(t('card.why'), whyBody),
  );
  card.append(head, body);
  return card;
}
