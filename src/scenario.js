// Scenario player: a large pixel-art monitor overlay that plays a KPN use case in four acts
// (Situation -> Prompt -> Run -> Result) and the Chat vs Cowork intro explainer.
// The player only presses Next/Back; nothing is typed or chosen. Reaching the Result act completes the case.
import { config } from './config.js';
import { getLang, onLangChange, pick, t } from './i18n.js';
import { completeUseCase, isCompleted } from './progress.js';
import { OPEN_USE_CASE } from './rules.js';
import { polish, text } from './usecases.js';
import intro from './content/intro.json';

export const EXPLAINER_ID = intro.id;
const TRIED_KEY = 'tried';
const STEP_MS = 650;
const TYPE_MS = 14;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function button(label, className, onClick) {
  const b = el('button', `px-btn ${className ?? ''}`.trim(), label);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

function readTried() {
  try {
    const v = JSON.parse(localStorage.getItem(TRIED_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeTried(ids) {
  try {
    localStorage.setItem(TRIED_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable: the flag lasts for this page view only.
  }
}

// ---- file and deliverable helpers ----
const CAP_ORDER = ['Word', 'PowerPoint', 'Excel', 'Outlook', 'Teams', 'Dashboard', 'HTML'];
const KIND_OF_CAP = { word: 'word', powerpoint: 'powerpoint', excel: 'excel', outlook: 'outlook', teams: 'teams', dashboard: 'dashboard', html: 'html' };
const GLYPH = { word: 'W', excel: 'X', powerpoint: 'P', outlook: 'O', teams: 'T', dashboard: 'D', html: 'H', folder: '▣' };

// Guesses an app from a source name ("Complaint export" -> excel, "Teams thread" -> teams).
function fileKind(name, caps) {
  const n = name.toLowerCase();
  if (/teams|chat|message|thread|channel/.test(n)) return 'teams';
  if (/mail|inbox|outlook|invitation|calendar/.test(n)) return 'outlook';
  if (/deck|slides|presentation|powerpoint/.test(n)) return 'powerpoint';
  if (/export|workbook|sheet|xlsx|csv|table|ledger|register|list|log|data|figures|forecast|budget/.test(n)) return 'excel';
  if (/dashboard/.test(n)) return 'dashboard';
  if (/brief|note|memo|document|word|minutes|policy|contract|template|report|plan|guide/.test(n)) return 'word';
  const first = (caps ?? []).find((c) => c !== 'Word');
  return KIND_OF_CAP[(first ?? 'Word').toLowerCase()] ?? 'word';
}

function primaryKind(caps) {
  const cap = CAP_ORDER.find((c) => (caps ?? []).includes(c)) ?? 'Word';
  return KIND_OF_CAP[cap.toLowerCase()];
}

function fileIcon(kind, name, detail) {
  const wrap = el('div', `sc-file sc-file--${kind}`);
  wrap.title = detail ?? '';
  const icon = el('span', 'sc-file-icon', GLYPH[kind] ?? 'F');
  icon.setAttribute('aria-hidden', 'true');
  wrap.append(icon, el('span', 'sc-file-name', name));
  if (detail) wrap.append(el('span', 'sc-file-detail', detail));
  return wrap;
}

function bubble(from, body, kind = 'them') {
  const wrap = el('div', `sc-bubble sc-bubble--${kind}`);
  wrap.append(el('span', 'sc-bubble-from', from));
  const p = el('p', 'sc-bubble-text');
  if (typeof body === 'string') p.textContent = body;
  else p.append(body);
  wrap.append(p);
  return wrap;
}

// Splits "A; b; and c." into checklist items.
function sentences(s) {
  return String(s ?? '')
    .split(/;\s+|\.\s+(?=[A-Z])/)
    .map((x) => x.replace(/^and\s+/i, '').replace(/\.$/, '').trim())
    .filter(Boolean);
}

// Highlights [square bracket] placeholders in prompt text.
function withBrackets(s) {
  const frag = document.createDocumentFragment();
  String(s ?? '')
    .split(/(\[[^\]]+\])/)
    .forEach((part) => {
      if (/^\[[^\]]+\]$/.test(part)) frag.append(el('mark', 'uc-fill', part));
      else if (part) frag.append(document.createTextNode(part));
    });
  return frag;
}

export function fullPrompt(uc) {
  const p = text(uc).prompt ?? {};
  return [p.outcome, p.inputs, p.doneWhen, p.constraints, p.approval].filter(Boolean).join('\n\n');
}

// ---- mock deliverable windows ----
function appWindow(kind, title, content) {
  const win = el('div', `sc-doc sc-doc--${kind}`);
  const bar = el('div', 'sc-doc-bar');
  bar.append(el('span', 'sc-doc-app', `${GLYPH[kind]} ${t(`sc.doc.${kind}`)}`), el('span', 'sc-doc-title', title), el('span', 'sc-doc-dots', '● ● ●'));
  win.append(bar, content);
  return win;
}

function deliverable(uc, lang) {
  const d = text(uc);
  const good = d.run?.good ?? {};
  const over = polish(uc)?.outcome;
  const kind = over?.kind ?? primaryKind(uc.capabilities);
  const title = over?.title ?? good.title ?? pick(uc.title);
  const lines = over?.lines ?? (good.items ?? []).map((i) => (typeof i === 'string' ? { text: i } : i));
  const body = el('div', 'sc-doc-body');

  if (kind === 'excel') {
    const table = el('table', 'sc-sheet');
    const head = el('tr');
    ['', 'A', 'B'].forEach((h) => head.append(el('th', '', h)));
    table.append(head);
    lines.forEach((l, i) => {
      const tr = el('tr');
      tr.append(el('th', '', String(i + 1)), el('td', '', l.text), el('td', 'sc-sheet-src', l.src ?? ''));
      table.append(tr);
    });
    body.append(el('div', 'sc-sheet-tab', t('sc.doc.sheet')), table);
  } else if (kind === 'powerpoint') {
    const slide = el('div', 'sc-slide');
    slide.append(el('h4', 'sc-slide-title', title));
    const ul = el('ul');
    lines.forEach((l) => ul.append(el('li', '', l.text)));
    slide.append(ul);
    body.append(slide, el('p', 'sc-doc-meta', `${t('sc.doc.slide')} 1 / ${Math.max(3, lines.length)}`));
  } else if (kind === 'outlook' || kind === 'teams') {
    const hdr = el('div', 'sc-mail-head');
    hdr.append(el('p', '', `${t('sc.doc.to')}: ${over?.to ?? d.fit?.fields?.find((f) => /review|team|manager|lead/i.test(f.label))?.label ?? '…'}`));
    hdr.append(el('p', '', `${t('sc.doc.subject')}: ${title}`));
    body.append(hdr);
    lines.forEach((l) => body.append(el('p', 'sc-doc-line', l.text)));
  } else {
    body.append(el('h4', 'sc-doc-h', title));
    lines.forEach((l) => {
      const p = el('p', 'sc-doc-line', l.text);
      if (l.src) p.append(el('small', 'sc-doc-src', ` — ${t('sc.doc.source')}: ${l.src}`));
      body.append(p);
    });
  }
  if (!over && good.gap) body.append(el('p', 'sc-doc-gap', good.gap));
  body.append(el('p', 'sc-doc-draft', t('sc.doc.draft')));
  return appWindow(kind, over?.fileName ?? `${pick(uc.title)}${{ excel: '.xlsx', powerpoint: '.pptx', word: '.docx' }[kind] ?? ''}`, body, lang);
}

// ---- comparison panel (the key message: Cowork is more valuable than Copilot Chat) ----
function comparison(uc) {
  const why = text(uc).why ?? {};
  const wrap = el('section', 'sc-compare');
  wrap.append(el('h3', 'sc-h sc-compare-title', t('sc.compare.title')), el('p', 'sc-lead', why.lead ?? t('sc.compare.lead')));
  const cols = el('div', 'sc-compare-cols');
  const col = (cls, titleKey, generic, specific, verdict) => {
    const c = el('div', `sc-col ${cls}`);
    c.append(el('h4', 'sc-col-title', t(titleKey)));
    const ul = el('ul', 'sc-col-list');
    generic.forEach((s) => ul.append(el('li', 'sc-col-generic', s)));
    (specific ?? []).forEach((s) => ul.append(el('li', '', s)));
    c.append(ul);
    if (verdict) c.append(el('p', 'sc-verdict', verdict));
    return c;
  };
  cols.append(
    col('sc-col--chat', 'sc.compare.chat', [1, 2, 3, 4].map((i) => t(`sc.compare.chat.${i}`)), why.chat, why.chatVerdict),
    col('sc-col--cowork', 'sc.compare.cowork', [1, 2, 3, 4].map((i) => t(`sc.compare.cowork.${i}`)), why.cowork, why.coworkVerdict),
  );
  wrap.append(cols);
  return wrap;
}

export function initScenarioPlayer({ useCases, coworkUrl = config.coworkUrl, target = window } = {}) {
  const dlg = el('dialog', 'sc-dialog');
  dlg.setAttribute('aria-label', 'Scenario');
  const monitor = el('div', 'sc-monitor');
  const bezel = el('div', 'sc-bezel');
  const led = el('span', 'sc-led');
  const bezelTitle = el('span', 'sc-bezel-title');
  const closeBtn = button('×', 'sc-close', () => dlg.close());
  closeBtn.setAttribute('aria-label', t('sc.close'));
  bezel.append(led, bezelTitle, closeBtn);
  const screen = el('div', 'sc-screen');
  const head = el('header', 'sc-head');
  const body = el('div', 'sc-body');
  body.tabIndex = -1;
  const foot = el('footer', 'sc-foot');
  screen.append(head, body);
  monitor.append(bezel, screen, foot);
  const stand = el('div', 'sc-stand');
  dlg.append(monitor, stand);
  document.body.append(dlg);

  let current = null; // { kind: 'case' | 'intro', uc, act }
  let timers = [];
  let typing = null; // { finish() } while the prompt is typing
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
    typing = null;
  };
  const later = (fn, ms) => timers.push(setTimeout(fn, reduceMotion() ? 0 : ms));

  // ---- act renderers ----
  // "Take it to work" box: copy the full prompt and open Cowork. Shown at the end of Act 2 and in Act 4.
  function takeaway(uc) {
    const box = el('aside', 'sc-takeaway');
    box.append(el('h3', 'sc-h', t('sc.takeaway.title')), el('p', 'sc-small', t('sc.takeaway.text')));
    const row = el('div', 'sc-takeaway-row');
    const copy = button(t('sc.copy'), 'sc-copy', async () => {
      try {
        await navigator.clipboard.writeText(fullPrompt(uc));
        copy.textContent = t('sc.copied');
        copy.classList.add('is-copied');
      } catch {
        copy.textContent = t('sc.copyFailed');
      }
      // Plain timeout: the confirmation must stay visible even with reduced motion.
      timers.push(setTimeout(() => {
        copy.textContent = t('sc.copy');
        copy.classList.remove('is-copied');
      }, 1800));
    });
    const open = el('a', 'px-btn px-btn--primary sc-open-cowork', t('sc.try'));
    open.href = coworkUrl;
    open.target = '_blank';
    open.rel = 'noopener';
    row.append(copy, open);
    box.append(row);
    return box;
  }

  function actSituation(uc) {
    const d = text(uc);
    const over = polish(uc)?.situation;
    const view = el('div', 'sc-act sc-act--situation');
    view.append(el('p', 'sc-lead', over?.lead ?? d.hook));
    const files = el('div', 'sc-files');
    files.append(el('h3', 'sc-h', t('sc.files')));
    const row = el('div', 'sc-files-row');
    const sources = over?.files ?? (d.safety?.sources ?? []).map((s) => ({ name: s.name, detail: s.detail }));
    sources.forEach((s) => row.append(fileIcon(s.kind ?? fileKind(s.name, uc.capabilities), s.name, s.detail)));
    files.append(row);
    const chat = el('div', 'sc-chat');
    const messages = over?.messages ?? [
      { from: d.roles?.[0] ?? t('sc.colleague'), kind: 'them', text: d.situation },
      { from: t('sc.you'), kind: 'you', text: d.fit?.ownPlaceholder },
    ];
    messages.filter((m) => m.text).forEach((m) => chat.append(bubble(m.from === 'you' ? t('sc.you') : m.from, m.text, m.kind ?? 'them')));
    view.append(chat, files);
    return view;
  }

  function actPrompt(uc) {
    const d = text(uc);
    const view = el('div', 'sc-act sc-act--prompt');
    view.append(el('p', 'sc-lead', t('sc.prompt.lead')));
    const chat = el('div', 'sc-chat');
    const typed = el('span', 'sc-typed');
    const caret = el('span', 'sc-caret');
    const holder = document.createDocumentFragment();
    holder.append(typed, caret);
    chat.append(bubble(t('sc.you'), holder, 'you'));
    view.append(chat);
    const full = el('details', 'sc-prompt-full');
    full.append(el('summary', '', t('card.prompt')));
    const p = d.prompt ?? {};
    [['outcome', p.outcome], ['inputs', p.inputs], ['doneWhen', p.doneWhen], ['constraints', p.constraints], ['approval', p.approval]].forEach(([k, v]) => {
      if (!v) return;
      const row = el('div', 'sc-prompt-row');
      const para = el('p');
      para.append(withBrackets(v));
      row.append(el('b', '', t(`sc.prompt.${k}`)), para);
      full.append(row);
    });
    full.hidden = true;
    const take = takeaway(uc);
    take.hidden = true;
    view.append(full, take);

    const message = d.run?.userMsg ?? p.outcome ?? '';
    const reply = () => {
      caret.remove();
      full.hidden = false;
      take.hidden = false;
      later(() => {
        chat.append(bubble(t('sc.cowork'), d.run?.coworkMsg ?? '', 'cowork'));
        body.scrollTop = body.scrollHeight;
      }, 350);
    };
    let i = 0;
    const finish = () => {
      clearTimers();
      typed.textContent = message;
      reply();
      renderFoot();
    };
    typing = { finish };
    if (reduceMotion()) finish();
    else {
      const tick = () => {
        i += 1 + (Math.random() < 0.3 ? 1 : 0);
        typed.textContent = message.slice(0, i);
        if (i < message.length) timers.push(setTimeout(tick, TYPE_MS));
        else {
          typing = null;
          reply();
          renderFoot();
        }
      };
      tick();
    }
    return view;
  }

  function actRun(uc) {
    const d = text(uc);
    const steps = d.run?.steps ?? [];
    const view = el('div', 'sc-act sc-act--run');
    view.append(el('p', 'sc-lead', t('sc.run.lead')));
    const progress = el('div', 'sc-run-progress');
    const barEl = el('div', 'px-bar');
    const segs = 20;
    for (let i = 0; i < segs; i++) barEl.append(el('i'));
    const count = el('span', 'sc-run-count');
    progress.append(barEl, count);
    const list = el('ol', 'sc-steps');
    const items = steps.map((s, idx) => {
      const li = el('li', `sc-step ${s.pause ? 'sc-step--pause' : ''}`.trim());
      const mark = el('span', 'sc-step-mark', '');
      const main = el('div', 'sc-step-main');
      main.append(el('span', 'sc-step-text', s.text));
      if (s.note) main.append(el('span', 'sc-step-note', s.note));
      li.append(mark, main);
      li.dataset.state = 'waiting';
      list.append(li);
      return { li, mark, idx, step: s };
    });
    const sources = (d.safety?.sources ?? []).slice(0, 4);
    const files = el('div', 'sc-files-row sc-files-row--small');
    sources.forEach((s) => files.append(fileIcon(fileKind(s.name, uc.capabilities), s.name)));
    const approval = el('div', 'sc-approval');
    approval.hidden = true;
    approval.append(el('h3', 'sc-h', t('sc.run.pause')), el('p', '', d.prompt?.approval ?? t('sc.run.pause.hint')));
    view.append(progress, files, list, approval);

    let done = 0;
    const setBar = () => {
      const filled = Math.round((done / steps.length) * segs);
      [...barEl.children].forEach((seg, i) => seg.classList.toggle('f', i < filled));
      count.textContent = `${t('sc.step')} ${Math.min(done, steps.length)} ${t('sc.of')} ${steps.length}`;
    };
    setBar();
    const reveal = (k) => {
      if (k >= items.length) {
        runFinished = true;
        renderFoot();
        return;
      }
      const it = items[k];
      it.li.dataset.state = 'working';
      it.mark.textContent = '…';
      items.forEach((o) => o.li.classList.toggle('is-current', o === it));
      it.li.scrollIntoView?.({ block: 'nearest' });
      later(() => {
        it.li.dataset.state = 'done';
        it.mark.textContent = it.step.pause ? '‖' : '✓';
        done = k + 1;
        setBar();
        if (it.step.pause) {
          approval.hidden = false;
          body.scrollTop = body.scrollHeight;
        }
        later(() => reveal(k + 1), 120);
      }, STEP_MS);
    };
    runFinished = false;
    renderFoot();
    later(() => reveal(0), 250);
    return view;
  }

  function actOutcome(uc) {
    const d = text(uc);
    const view = el('div', 'sc-act sc-act--outcome');
    const newly = completeUseCase(uc.id);
    if (newly || isCompleted(uc.id)) {
      const banner = el('p', `sc-completed ${newly ? 'is-new' : ''}`.trim(), t('sc.completed'));
      view.append(banner);
    }
    view.append(el('p', 'sc-lead', t('sc.outcome.lead')));
    const grid = el('div', 'sc-outcome-grid');
    const left = el('div', 'sc-outcome-main');
    left.append(el('h3', 'sc-h', t('sc.outcome.deliverable')), deliverable(uc, getLang()));
    if (d.run?.good?.ask) left.append(bubble(t('sc.cowork'), d.run.good.ask, 'cowork'));
    const right = el('div', 'sc-outcome-side');
    const checks = sentences(d.prompt?.doneWhen);
    if (checks.length) {
      right.append(el('h3', 'sc-h', t('sc.outcome.checks')));
      const ul = el('ul', 'sc-checklist');
      checks.forEach((c) => {
        const li = el('li');
        li.append(el('span', 'px-check', '✓'), el('span', '', c));
        ul.append(li);
      });
      right.append(ul);
    }
    right.append(el('h3', 'sc-h', t('sc.outcome.value')));
    const value = polish(uc)?.outcome?.value ?? [d.why?.coworkVerdict, d.run?.good?.why ? `${t('sc.cowork')}: ${d.run.good.why}` : null].filter(Boolean);
    value.forEach((v) => right.append(el('p', 'sc-value', v)));
    if (d.run?.good?.notTouched) right.append(el('p', 'sc-small', `${t('sc.outcome.notTouched')}: ${d.run.good.notTouched}`));
    right.append(takeaway(uc));
    grid.append(left, right);
    view.append(grid, comparison(uc));

    const actions = el('div', 'sc-actions');
    const tried = el('label', 'sc-tried');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = readTried().includes(uc.id);
    cb.addEventListener('change', () => {
      const ids = readTried().filter((x) => x !== uc.id);
      writeTried(cb.checked ? [...ids, uc.id] : ids);
    });
    tried.append(cb, el('span', '', t('sc.tried')));
    actions.append(tried);
    view.append(actions);
    return view;
  }

  function actIntro(screenIdx) {
    const content = intro[getLang()] ?? intro.en;
    const s = content.screens[screenIdx];
    const view = el('div', 'sc-act sc-act--intro');
    view.append(el('h3', 'sc-intro-title', s.title), el('p', 'sc-lead', s.lead));
    if (s.chat && s.cowork) {
      const cols = el('div', 'sc-compare-cols');
      const col = (cls, titleKey, list) => {
        const c = el('div', `sc-col ${cls}`);
        c.append(el('h4', 'sc-col-title', t(titleKey)));
        const ul = el('ul', 'sc-col-list');
        list.forEach((x) => ul.append(el('li', '', x)));
        c.append(ul);
        return c;
      };
      cols.append(col('sc-col--chat', 'sc.compare.chat', s.chat), col('sc-col--cowork', 'sc.compare.cowork', s.cowork));
      view.append(cols);
    }
    (s.paragraphs ?? []).forEach((p) => view.append(el('p', 'sc-para', p)));
    if (screenIdx === content.screens.length - 1) completeUseCase(EXPLAINER_ID);
    return view;
  }

  // ---- shell ----
  const ACTS = ['situation', 'prompt', 'run', 'outcome'];
  let runFinished = false;

  function renderHead() {
    head.replaceChildren();
    if (current.kind === 'intro') {
      const content = intro[getLang()] ?? intro.en;
      head.append(el('h2', 'sc-title', content.title));
      const dots = el('ol', 'sc-dots');
      content.screens.forEach((_, i) => dots.append(el('li', i === current.act ? 'is-on' : i < current.act ? 'is-done' : '', String(i + 1))));
      head.append(dots);
      return;
    }
    const uc = current.uc;
    const titleRow = el('div', 'sc-title-row');
    titleRow.append(el('span', 'sc-case-id', uc.id), el('h2', 'sc-title', pick(uc.title)));
    const chips = el('div', 'sc-chips');
    chips.append(el('span', 'uc-chip', t(`dept.${uc.meta.department}`)));
    (uc.capabilities ?? []).forEach((c) => chips.append(el('span', 'uc-chip uc-chip--alt', c)));
    titleRow.append(chips);
    head.append(titleRow);
    const nav = el('ol', 'sc-acts');
    ACTS.forEach((a, i) => {
      const li = el('li', i === current.act ? 'is-on' : i < current.act ? 'is-done' : '');
      li.append(el('span', 'sc-act-num', String(i + 1)), el('span', 'sc-act-name', t(`sc.act.${a}`)));
      nav.append(li);
    });
    head.append(nav);
  }

  function renderFoot() {
    foot.replaceChildren();
    if (!current) return;
    const total = current.kind === 'intro' ? (intro[getLang()] ?? intro.en).screens.length : ACTS.length;
    const last = current.act === total - 1;
    const back = button(t('sc.back'), '', () => go(current.act - 1));
    back.disabled = current.act === 0;
    let label = last ? t('sc.finish') : t('sc.next');
    let disabled = false;
    if (current.kind === 'case' && current.act === 1 && typing) label = t('sc.skip');
    if (current.kind === 'case' && current.act === 2) {
      label = t('sc.approve');
      disabled = !runFinished;
    }
    const next = button(label, 'px-btn--primary', () => {
      if (typing) return typing.finish();
      if (last) dlg.close();
      else go(current.act + 1);
    });
    next.disabled = disabled;
    next.id = 'sc-next';
    const pos = el('span', 'sc-pos', `${current.act + 1} / ${total}`);
    foot.append(back, pos, next);
  }

  function go(act) {
    clearTimers();
    current.act = act;
    runFinished = false;
    renderHead();
    body.replaceChildren(current.kind === 'intro' ? actIntro(act) : [actSituation, actPrompt, actRun, actOutcome][act](current.uc));
    body.scrollTop = 0;
    renderFoot();
    body.focus({ preventScroll: true });
  }

  function open(id) {
    if (id === EXPLAINER_ID) {
      current = { kind: 'intro', act: 0 };
      bezelTitle.textContent = 'KPN · Cowork';
    } else {
      const uc = useCases.find((u) => u.id === id);
      if (!uc) return false;
      current = { kind: 'case', uc, act: 0 };
      bezelTitle.textContent = `KPN · Cowork · ${uc.id}`;
    }
    dlg.classList.toggle('sc-dialog--intro', current.kind === 'intro');
    if (!dlg.open) dlg.showModal();
    go(0);
    return true;
  }

  dlg.addEventListener('close', () => {
    clearTimers();
    current = null;
    body.replaceChildren();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('keydown', (e) => {
    if (!current || e.target.matches('input, textarea, a, button, summary')) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') document.getElementById('sc-next')?.click();
    if (e.key === 'ArrowLeft' && current.act > 0) go(current.act - 1);
  });
  target.addEventListener(OPEN_USE_CASE, (e) => open(e.detail.useCaseId));
  onLangChange(() => {
    closeBtn.setAttribute('aria-label', t('sc.close'));
    if (current) go(current.act);
  });

  return { open, close: () => dlg.close(), dialog: dlg };
}
