// Strings and small DOM helpers shared by the document-style panes (Library, How to start,
// Responsible AI). These panes follow the approved KPN landing page, whose dictionary lives in
// `content/doc-strings.json`; the game keeps using `i18n.js`.
import { config } from './config.js';
import { getLang } from './i18n.js';
import strings from './content/doc-strings.json';

// Looks a key up in the current language (English fallback) and fills `{var}` placeholders.
export function tr(key, vars = {}) {
  const raw = strings[getLang()]?.[key] ?? strings.en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, name) => {
    if (name === 'customer') return config.companyName;
    return name in vars ? String(vars[name]) : m;
  });
}

// Creates an element; `attrs` may contain `class`, `data-*`, `aria-*`, `html` (trusted markup) or `text`.
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'class') node.className = v;
    else if (k === 'hidden') node.hidden = Boolean(v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children.filter((c) => c != null && c !== false));
  return node;
}

// Renders the landing page's light inline markup: **bold** and `code`.
export function rich(text) {
  const frag = document.createDocumentFragment();
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**')) frag.append(el('strong', { text: part.slice(2, -2) }));
    else if (part.startsWith('`')) frag.append(el('code', { text: part.slice(1, -1) }));
    else frag.append(document.createTextNode(part));
  }
  return frag;
}

// Wraps `[bracketed]` placeholders in <mark> so the player sees what to fill in.
export function withMarks(text) {
  const frag = document.createDocumentFragment();
  String(text).split(/(\[[^\]]+\])/g).forEach((part) => {
    if (!part) return;
    if (part.startsWith('[')) frag.append(el('mark', { text: part }));
    else frag.append(document.createTextNode(part));
  });
  return frag;
}

export const svg = (paths, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

// Copies text to the clipboard and reports the outcome through the button label.
export async function copyWithFeedback(button, text, okLabel, idleLabel) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = okLabel;
  } catch {
    button.textContent = '!';
  }
  setTimeout(() => { button.textContent = idleLabel; }, 1500);
}
