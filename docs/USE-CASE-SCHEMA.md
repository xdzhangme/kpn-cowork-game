# Use Case Data Schema

Implements the content model of PRD section 5 and the data contract of section 6.

- Data files: `public/data/kpn-use-cases-en.json` and `public/data/kpn-use-cases-nl.json` (one JSON array each, one entry per use case, same ids in the same order). They are KPN's exported use-case library and are treated as the source of truth; do not hand-edit them in this repo, replace them with a newer export.
- Loaded at runtime by `src/usecases.js`, which merges both languages into one record per case and exposes `text(uc)` for the current language.
- Shared by the Library tab, the game objects and the scenario player. Map objects reference a use case by `id`.
- Hand-polished scenario content lives separately in `src/data/scenario-overrides.json` (see below).
- Validate with `npm run validate` (`scripts/validate-use-cases.mjs`). It checks required fields, enum values, duplicate ids, en/nl parity (same ids, order, department, workload, step count), at least one `pause` step per case, and that overrides reference known ids with the documented shape.

## Use case fields (per language file)

| Field | Type | Shown as |
| --- | --- | --- |
| `id` | `ABC-01` style, unique | Object binding, deep links, progress key |
| `icon` | string (emoji) | Card and object icon |
| `title`, `hook` | string | Title and one-line hook |
| `department` | one of the 8 KPN departments, or `null` for GEN cases | Room assignment and department chip |
| `roles` | string[] | Roles line; `roles[0]` is the sender of the first situation message |
| `workload` | `Light`, `Medium`, `Heavy` | Chip |
| `executionMode` | `On-demand` | Chip |
| `collaborationScope` | `Personal`, `Group`, `Cross-team` | Chip |
| `capabilities` | subset of `Word`, `Excel`, `PowerPoint`, `Outlook`, `Teams`, `HTML`, `Dashboard` | Chips; first entry picks the deliverable preview window |
| `situation` | string | Act 1 message bubble |
| `prompt.outcome`, `prompt.inputs`, `prompt.doneWhen`, `prompt.constraints`, `prompt.approval` | string | Full prompt (Act 2), done-when checklist and approval pause (Acts 3-4) |
| `safety.sources[]` | `{name, detail}` | Act 1 file icons (kind inferred from the name) |
| `run.userMsg`, `run.coworkMsg` | string | Act 2 typewriter prompt and Cowork reply |
| `run.steps[]` | `{text, note?, pause?}` | Act 3 steps; `pause: true` shows the approval card |
| `run.good` | `{title, items[{text, src}], gap, notTouched, ask, why}` | Act 4 deliverable preview (fallback when not overridden) |
| `fit`, `how`, `why` | objects | Library card sections; `why.chat/cowork` feed the Chat vs Cowork panel |
| `credits` | number | **Never displayed** (qualitative value only) |

Departments: `Consumer`, `Business - SME`, `Business - Tailored Solutions`, `Business - LCE`, `Network, Operations & IT (NOI)`, `Wholesale`, `People, Learning & Adoption`, `Finance, Tax & Business Control`. `src/usecases.js` maps them to room ids (`con`, `sme`, `tso`, `lce`, `noi`, `who`, `pla`, `fin`, `general`).

## Scenario overrides (`src/data/scenario-overrides.json`)

An object keyed by use-case id. Each id has optional `en` and `nl` blocks; every field is optional and falls back to the generated template (Dutch falls back to English for the whole block when `nl` is absent).

```json
{
  "CON-01": {
    "en": {
      "situation": {
        "lead": "Monday morning on the technical service desk...",
        "files": [{ "name": "contact-reasons_oct.xlsx", "detail": "4,120 rows", "kind": "excel" }],
        "messages": [{ "from": "Team lead", "kind": "them", "text": "..." }]
      },
      "outcome": {
        "kind": "word",
        "title": "Customer issue signal brief, October",
        "fileName": "Customer-issue-signal-brief_Oct.docx",
        "lines": [{ "text": "1. WiFi drops after a router restart: 412 contacts", "src": "contact-reasons_oct.xlsx" }],
        "value": ["One labelled brief with the counting already done."]
      }
    }
  }
}
```

- `messages[].kind`: `them` (colleague), `you` (the player) or `cowork`.
- `files[].kind` and `outcome.kind`: `word`, `excel`, `powerpoint`, `outlook`, `teams` or `file`.
- Keys starting with `$` (such as `$comment`) are ignored.
