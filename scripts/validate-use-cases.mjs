// Validates the KPN use-case data (public/data/kpn-use-cases-{en,nl}.json) and the
// optional scenario overrides (src/data/scenario-overrides.json).
// Usage: npm run validate
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const FILES = {
  en: fileURLToPath(new URL('public/data/kpn-use-cases-en.json', root)),
  nl: fileURLToPath(new URL('public/data/kpn-use-cases-nl.json', root)),
  overrides: fileURLToPath(new URL('src/data/scenario-overrides.json', root)),
};

export const DEPARTMENTS = [
  'Consumer',
  'Business - SME',
  'Business - Tailored Solutions',
  'Business - LCE',
  'Network, Operations & IT (NOI)',
  'Wholesale',
  'People, Learning & Adoption',
  'Finance, Tax & Business Control',
];
export const WORKLOADS = ['Light', 'Medium', 'Heavy'];
export const EXECUTION_MODES = ['On-demand', 'Scheduled'];
export const COLLABORATION_SCOPES = ['Personal', 'Group', 'Cross-team'];
export const CAPABILITIES = ['Word', 'Excel', 'PowerPoint', 'Outlook', 'Teams', 'HTML', 'Dashboard'];
export const MESSAGE_KINDS = ['them', 'you', 'cowork'];
export const FILE_KINDS = ['word', 'excel', 'powerpoint', 'outlook', 'teams', 'file'];
const ID_PATTERN = /^[A-Z]{3}-\d{2}$/;

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isStrArr = (v, min = 0) => Array.isArray(v) && v.length >= min && v.every(isStr);

// Validates one language file. Returns a list of error strings.
export function validateCases(data, lang) {
  const errors = [];
  const err = (m) => errors.push(`${lang}: ${m}`);
  if (!Array.isArray(data)) return [`${lang}: root must be an array of use cases`];
  if (data.length === 0) err('root must contain at least one use case');
  const seen = new Set();

  data.forEach((uc, i) => {
    const at = `[${i}]${uc && isStr(uc.id) ? ` (${uc.id})` : ''}`;
    if (!uc || typeof uc !== 'object') return err(`${at}: must be an object`);

    if (!isStr(uc.id)) err(`${at}.id: missing`);
    else {
      if (!ID_PATTERN.test(uc.id)) err(`${at}.id: must look like ABC-01`);
      if (seen.has(uc.id)) err(`${at}.id: duplicate id "${uc.id}"`);
      seen.add(uc.id);
    }
    for (const f of ['icon', 'title', 'hook', 'situation']) if (!isStr(uc[f])) err(`${at}.${f}: missing`);

    // department is null for the general (GEN) cases.
    if (uc.department === null || uc.department === '') {
      if (!String(uc.id).startsWith('GEN-')) err(`${at}.department: only GEN cases may be empty`);
    } else if (!DEPARTMENTS.includes(uc.department)) {
      err(`${at}.department: must be one of ${DEPARTMENTS.join(', ')} or null`);
    }
    if (!Array.isArray(uc.roles)) err(`${at}.roles: must be an array`);
    if (!WORKLOADS.includes(uc.workload)) err(`${at}.workload: must be one of ${WORKLOADS.join(', ')}`);
    if (!EXECUTION_MODES.includes(uc.executionMode)) err(`${at}.executionMode: must be one of ${EXECUTION_MODES.join(', ')}`);
    if (!COLLABORATION_SCOPES.includes(uc.collaborationScope)) {
      err(`${at}.collaborationScope: must be one of ${COLLABORATION_SCOPES.join(', ')}`);
    }
    if (!isStrArr(uc.capabilities, 1)) err(`${at}.capabilities: must be a non-empty array`);
    else for (const c of uc.capabilities) if (!CAPABILITIES.includes(c)) err(`${at}.capabilities: unknown "${c}"`);

    const p = uc.prompt;
    if (!p || typeof p !== 'object') err(`${at}.prompt: missing`);
    else for (const f of ['outcome', 'inputs', 'doneWhen']) if (!isStr(p[f])) err(`${at}.prompt.${f}: missing`);

    const s = uc.safety;
    if (!s || typeof s !== 'object') err(`${at}.safety: missing`);
    else if (!Array.isArray(s.sources) || !s.sources.every((x) => x && isStr(x.name))) {
      err(`${at}.safety.sources: must be an array of {name, detail}`);
    }

    const r = uc.run;
    if (!r || typeof r !== 'object') err(`${at}.run: missing`);
    else {
      for (const f of ['userMsg', 'coworkMsg']) if (!isStr(r[f])) err(`${at}.run.${f}: missing`);
      if (!Array.isArray(r.steps) || r.steps.length === 0 || !r.steps.every((x) => x && isStr(x.text))) {
        err(`${at}.run.steps: must be a non-empty array of {text}`);
      } else {
        const pauses = r.steps.filter((x) => x.pause).length;
        if (pauses === 0) err(`${at}.run.steps: at least one step must have pause: true (the approval point)`);
      }
      if (!r.good || !isStr(r.good.title) || !Array.isArray(r.good.items) || !r.good.items.every((x) => x && isStr(x.text))) {
        err(`${at}.run.good: needs title and items[{text}]`);
      }
    }

    const w = uc.why;
    if (!w || typeof w !== 'object') err(`${at}.why: missing`);
    else {
      if (!isStrArr(w.chat, 1)) err(`${at}.why.chat: must be a non-empty array`);
      if (!isStrArr(w.cowork, 1)) err(`${at}.why.cowork: must be a non-empty array`);
    }
    if (!uc.fit || !isStr(uc.fit.ownPlaceholder)) err(`${at}.fit.ownPlaceholder: missing`);
  });
  return errors;
}

// Both language files must describe the same cases in the same order.
export function validateParity(en, nl) {
  const errors = [];
  if (!Array.isArray(en) || !Array.isArray(nl)) return errors;
  if (en.length !== nl.length) errors.push(`parity: en has ${en.length} cases, nl has ${nl.length}`);
  const n = Math.min(en.length, nl.length);
  for (let i = 0; i < n; i++) {
    if (en[i]?.id !== nl[i]?.id) errors.push(`parity: [${i}] en "${en[i]?.id}" vs nl "${nl[i]?.id}"`);
    else {
      for (const f of ['department', 'workload', 'executionMode', 'collaborationScope']) {
        if (en[i][f] !== nl[i][f]) errors.push(`parity: ${en[i].id}.${f} differs between en and nl`);
      }
      if ((en[i].run?.steps?.length ?? 0) !== (nl[i].run?.steps?.length ?? 0)) {
        errors.push(`parity: ${en[i].id}.run.steps length differs between en and nl`);
      }
    }
  }
  return errors;
}

// Overrides may only reference known ids and must follow the documented shape.
export function validateOverrides(overrides, ids) {
  const errors = [];
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return ['overrides: root must be an object'];
  for (const [id, byLang] of Object.entries(overrides)) {
    if (id.startsWith('$')) continue;
    const at = `overrides.${id}`;
    if (!ids.has(id)) { errors.push(`${at}: unknown use-case id`); continue; }
    if (!byLang || typeof byLang !== 'object') { errors.push(`${at}: must be {en?, nl?}`); continue; }
    for (const [lang, o] of Object.entries(byLang)) {
      if (!['en', 'nl'].includes(lang)) { errors.push(`${at}.${lang}: unknown language`); continue; }
      const sit = o?.situation;
      if (sit) {
        if (sit.lead !== undefined && !isStr(sit.lead)) errors.push(`${at}.${lang}.situation.lead: must be a string`);
        if (sit.messages !== undefined) {
          if (!Array.isArray(sit.messages) || sit.messages.length === 0) errors.push(`${at}.${lang}.situation.messages: must be a non-empty array`);
          else sit.messages.forEach((m, i) => {
            if (!isStr(m?.text)) errors.push(`${at}.${lang}.situation.messages[${i}].text: missing`);
            if (!MESSAGE_KINDS.includes(m?.kind)) errors.push(`${at}.${lang}.situation.messages[${i}].kind: must be ${MESSAGE_KINDS.join('|')}`);
          });
        }
        if (sit.files !== undefined) {
          if (!Array.isArray(sit.files)) errors.push(`${at}.${lang}.situation.files: must be an array`);
          else sit.files.forEach((f, i) => {
            if (!isStr(f?.name)) errors.push(`${at}.${lang}.situation.files[${i}].name: missing`);
            if (f?.kind !== undefined && !FILE_KINDS.includes(f.kind)) errors.push(`${at}.${lang}.situation.files[${i}].kind: must be ${FILE_KINDS.join('|')}`);
          });
        }
      }
      const out = o?.outcome;
      if (out) {
        if (out.kind !== undefined && !FILE_KINDS.includes(out.kind)) errors.push(`${at}.${lang}.outcome.kind: must be ${FILE_KINDS.join('|')}`);
        if (out.lines !== undefined && (!Array.isArray(out.lines) || !out.lines.every((l) => isStr(l?.text)))) {
          errors.push(`${at}.${lang}.outcome.lines: must be an array of {text, src?}`);
        }
        if (out.value !== undefined && !isStrArr(out.value, 1)) errors.push(`${at}.${lang}.outcome.value: must be a non-empty string array`);
      }
    }
  }
  return errors;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`Cannot read ${file}: ${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const en = readJson(FILES.en);
  const nl = readJson(FILES.nl);
  const overrides = readJson(FILES.overrides);
  const errors = [
    ...validateCases(en, 'en'),
    ...validateCases(nl, 'nl'),
    ...validateParity(en, nl),
    ...validateOverrides(overrides, new Set(Array.isArray(en) ? en.map((u) => u.id) : [])),
  ];
  if (errors.length) {
    console.error(`Use case validation failed (${errors.length} problem${errors.length > 1 ? 's' : ''}):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  const polished = Object.keys(overrides).filter((k) => !k.startsWith('$')).length;
  console.log(`OK: ${en.length} use cases valid in en and nl; ${polished} hand-polished scenario override(s).`);
}
