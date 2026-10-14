# Keyword Matcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user keep a saved list of keywords, and see which of them appear in a scanned resume and which are missing.

**Architecture:** Matching runs in the browser against the `extractedText` the scan already returns (pure module, no server change to scanning). Two JSON lists per user (active keywords, suggestions) are stored in one new MySQL table behind `GET`/`PUT /ats/keywords`. A chip-input component is shown before the scan and inside the results.

**Tech Stack:** Express 5 + Knex + MySQL (server), React 19 + TypeScript + Vite + Tailwind (client), Vitest (node environment) for unit tests.

**Spec:** [docs/superpowers/specs/2026-10-13-keyword-matcher-design.md](../specs/2026-10-13-keyword-matcher-design.md)

## Global Constraints

- No AI, no paid APIs, **no new dependencies** (the server has no direct `zod` dependency, so validation is hand-written instead of the spec's zod; the rules are identical).
- Limits: 40 characters per term, 100 active, 200 suggestions (oldest dropped when full).
- A term lives in only one list; uniqueness is case-insensitive; the first spelling is kept.
- The PDF, its extracted text and any job posting are never stored. Only the two keyword lists are.
- Scan scoring and `POST /ats/scan` are unchanged. The keyword endpoints do **not** use `atsRateLimit`.
- Both endpoints use `isAuthenticated`, `validateSocialLogin(['google','github','linkedin'])`; CSRF is already global (`csrfProtection`), the client calls `getCsrfToken()` before `PUT`.
- Status colors (`ats-pass`, `ats-warn`) only on matched/missing items, always with an icon and text. No yellow accent, no gradients.
- Copy says matching is "Based on exact wording".
- Per the user's standing rule: test files are temporary. Create them for TDD, **never `git add` them**, and delete them in Task 8. Stage explicit paths only.
- Do not create a branch; work on `feat/job-description-keyword-matcher`.

## Review Focus

1. Saved keywords failed to load, then the user edits: the save must **not** overwrite their stored lists with an empty one (Task 5: editing disabled until a load succeeds).
2. Pasting `"CRM, crm,  Lead   generation\nSales"`: splits, trims, collapses spaces, dedupes case-insensitively (Task 3).
3. Terms with punctuation (`C++`, `C#`, `.NET`, `Node.js`, `P&L`, `CI/CD`) must match whole terms only: `C` must not match inside `C++`, and `Java` must not match `JavaScript` (Task 4).
4. Empty or whitespace-only resume text, or no active keywords: no crash, no `NaN%`, a clear empty state (Tasks 4, 7).
5. Rapid edits while a save is in flight: the last edit wins and saves are never sent out of order (Task 5).

---

## File Structure

Server
- Create `server/src/db/migrations/20261014090000_create_ats_keyword_preferences_table.js`: the table.
- Create `server/src/utils/atsKeywords.ts`: limits and `validateKeywordLists` (pure).
- Create `server/src/models/AtsKeywords.ts`: `get` / `save` for one user.
- Create `server/src/controllers/atsKeywords.ts`: `get_keywords`, `save_keywords`.
- Modify `server/src/routes/ats.ts`: two routes.

Client (all under `client/src/components/ats/` unless noted)
- Create `keywords.ts`: list types, limits and pure list operations (add, remove-to-suggestions, restore, delete, clear).
- Create `keyword-match.ts`: pure matcher.
- Create `keyword-api.ts`: `fetchKeywords`, `saveKeywords`.
- Create `useKeywordPreferences.ts`: load + debounced, serialized save.
- Create `KeywordBox.tsx`: chip input and suggestions.
- Create `KeywordMatch.tsx`: results section.
- Modify `types.ts` (no change needed, keyword types live in `keywords.ts`), `ScanResults.tsx`, `privacy-copy.ts`, `client/src/pages/ATSScanner.tsx`, `client/src/styles/ats.css`.

---

### Task 1: Server keyword validation

**Files:**
- Create: `server/src/utils/atsKeywords.ts`
- Test (temporary, do not commit): `server/src/utils/atsKeywords.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const MAX_TERM_LENGTH = 40;
  export const MAX_ACTIVE = 100;
  export const MAX_SUGGESTED = 200;
  export interface KeywordLists { active: string[]; suggested: string[] }
  export type ValidationResult = { ok: true; value: KeywordLists } | { ok: false; error: string };
  export const validateKeywordLists: (body: unknown) => ValidationResult;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// server/src/utils/atsKeywords.test.ts
import { describe, expect, it } from 'vitest';
import { validateKeywordLists, MAX_ACTIVE, MAX_SUGGESTED, MAX_TERM_LENGTH } from './atsKeywords';

describe('validateKeywordLists', () => {
  it('accepts valid lists and normalizes whitespace', () => {
    const r = validateKeywordLists({ active: ['  CRM ', 'Lead   generation'], suggested: ['React'] });
    expect(r).toEqual({ ok: true, value: { active: ['CRM', 'Lead generation'], suggested: ['React'] } });
  });
  it('accepts empty lists', () => {
    expect(validateKeywordLists({ active: [], suggested: [] })).toEqual({ ok: true, value: { active: [], suggested: [] } });
  });
  it('rejects a non-object body', () => {
    expect(validateKeywordLists(null).ok).toBe(false);
    expect(validateKeywordLists('x').ok).toBe(false);
  });
  it('rejects missing or non-array lists', () => {
    expect(validateKeywordLists({ active: [] }).ok).toBe(false);
    expect(validateKeywordLists({ active: 'a', suggested: [] }).ok).toBe(false);
  });
  it('rejects non-string and empty terms', () => {
    expect(validateKeywordLists({ active: [1], suggested: [] }).ok).toBe(false);
    expect(validateKeywordLists({ active: ['   '], suggested: [] }).ok).toBe(false);
  });
  it('rejects terms over the length limit', () => {
    expect(validateKeywordLists({ active: ['a'.repeat(MAX_TERM_LENGTH + 1)], suggested: [] }).ok).toBe(false);
    expect(validateKeywordLists({ active: ['a'.repeat(MAX_TERM_LENGTH)], suggested: [] }).ok).toBe(true);
  });
  it('rejects control characters', () => {
    expect(validateKeywordLists({ active: ['bad\u0000term'], suggested: [] }).ok).toBe(false);
  });
  it('rejects lists over the count limits', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => `term${i}`);
    expect(validateKeywordLists({ active: many(MAX_ACTIVE + 1), suggested: [] }).ok).toBe(false);
    expect(validateKeywordLists({ active: [], suggested: many(MAX_SUGGESTED + 1) }).ok).toBe(false);
    expect(validateKeywordLists({ active: many(MAX_ACTIVE), suggested: many(MAX_SUGGESTED).map((t) => `s${t}`) }).ok).toBe(true);
  });
  it('rejects case-insensitive duplicates within and across lists', () => {
    expect(validateKeywordLists({ active: ['CRM', 'crm'], suggested: [] }).ok).toBe(false);
    expect(validateKeywordLists({ active: ['CRM'], suggested: ['crm'] }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd server && npx vitest run src/utils/atsKeywords.test.ts`
Expected: FAIL (cannot resolve `./atsKeywords`).

- [ ] **Step 3: Write the implementation**

```ts
// server/src/utils/atsKeywords.ts
export const MAX_TERM_LENGTH = 40;
export const MAX_ACTIVE = 100;
export const MAX_SUGGESTED = 200;

export interface KeywordLists {
  active: string[];
  suggested: string[];
}

export type ValidationResult = { ok: true; value: KeywordLists } | { ok: false; error: string };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const normalize = (raw: string): string => raw.trim().replace(/\s+/g, ' ');

/** Checks one list; `seen` is shared across both lists so a term can only appear once overall. */
const checkList = (name: string, raw: unknown, max: number, seen: Set<string>): string[] | string => {
  if (!Array.isArray(raw)) return `"${name}" must be an array of strings.`;
  if (raw.length > max) return `"${name}" can hold at most ${max} keywords.`;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') return `Every keyword in "${name}" must be a string.`;
    const term = normalize(item);
    if (term.length === 0) return `Keywords in "${name}" cannot be empty.`;
    if (term.length > MAX_TERM_LENGTH) return `Keywords can be at most ${MAX_TERM_LENGTH} characters long.`;
    if (CONTROL_CHARS.test(term)) return 'Keywords cannot contain control characters.';
    const key = term.toLowerCase();
    if (seen.has(key)) return `"${term}" appears more than once.`;
    seen.add(key);
    out.push(term);
  }
  return out;
};

export const validateKeywordLists = (body: unknown): ValidationResult => {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Expected a JSON object.' };
  const { active, suggested } = body as Record<string, unknown>;
  const seen = new Set<string>();
  const a = checkList('active', active, MAX_ACTIVE, seen);
  if (typeof a === 'string') return { ok: false, error: a };
  const s = checkList('suggested', suggested, MAX_SUGGESTED, seen);
  if (typeof s === 'string') return { ok: false, error: s };
  return { ok: true, value: { active: a, suggested: s } };
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd server && npx vitest run src/utils/atsKeywords.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit (source only)**

```bash
git add server/src/utils/atsKeywords.ts
git commit -m "feat(ats): add keyword list validation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migration, model, controller and routes

**Files:**
- Create: `server/src/db/migrations/20261014090000_create_ats_keyword_preferences_table.js`
- Create: `server/src/models/AtsKeywords.ts`
- Create: `server/src/controllers/atsKeywords.ts`
- Modify: `server/src/routes/ats.ts`

**Interfaces:**
- Consumes: `KeywordLists`, `validateKeywordLists` from Task 1; `knex` default export from `../db/knex`; `generateId()` from `../utils/helper`; `User` from `@/types/interface.user`; `Controller` from `@/types/types.controller-type`.
- Produces: `atsKeywordsModel.get(userId: string): Promise<KeywordLists>`, `atsKeywordsModel.save(userId: string, lists: KeywordLists): Promise<void>`; routes `GET /ats/keywords` → `{ success: true, keywords: { active, suggested } }`, `PUT /ats/keywords` with `{ active, suggested }` → same shape, `400 { success: false, error }` on invalid input.

- [ ] **Step 1: Write the migration**

```js
// server/src/db/migrations/20261014090000_create_ats_keyword_preferences_table.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('ats_keyword_preferences', (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.json('active_keywords').notNullable();
    table.json('suggested_keywords').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('ats_keyword_preferences');
};
```

- [ ] **Step 2: Write the model**

```ts
// server/src/models/AtsKeywords.ts
import knex from '../db/knex';
import { generateId } from '../utils/helper';
import type { KeywordLists } from '../utils/atsKeywords';

// mysql2 returns JSON columns parsed, but MariaDB stores JSON as text, so accept both.
const parseList = (value: unknown): string[] => {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
};

export class AtsKeywordsModel {
  private tableName = 'ats_keyword_preferences';

  /** No row yet means the user has not saved anything: both lists are empty. */
  async get(userId: string): Promise<KeywordLists> {
    try {
      const row = await knex(this.tableName).where('user_id', userId).first();
      if (!row) return { active: [], suggested: [] };
      return { active: parseList(row.active_keywords), suggested: parseList(row.suggested_keywords) };
    } catch (error) {
      console.error('Error reading ATS keyword preferences:', error);
      throw error;
    }
  }

  async save(userId: string, lists: KeywordLists): Promise<void> {
    try {
      await knex(this.tableName)
        .insert({
          id: generateId(),
          user_id: userId,
          active_keywords: JSON.stringify(lists.active),
          suggested_keywords: JSON.stringify(lists.suggested),
        })
        .onConflict('user_id')
        .merge({
          active_keywords: JSON.stringify(lists.active),
          suggested_keywords: JSON.stringify(lists.suggested),
          updated_at: knex.fn.now(),
        });
    } catch (error) {
      console.error('Error saving ATS keyword preferences:', error);
      throw error;
    }
  }
}

export const atsKeywordsModel = new AtsKeywordsModel();
```

- [ ] **Step 3: Write the controller**

```ts
// server/src/controllers/atsKeywords.ts
import { Controller } from "@/types/types.controller-type";
import type { User } from '@/types/interface.user';
import { atsKeywordsModel } from '../models/AtsKeywords';
import { validateKeywordLists } from '../utils/atsKeywords';

export const get_keywords: Controller = async (req, res) => {
  try {
    const user = req.user as User;
    const keywords = await atsKeywordsModel.get(user.id);
    return res.status(200).json({ success: true, keywords });
  } catch (error) {
    console.error('Failed to load ATS keywords:', error);
    return res.status(500).json({ success: false, error: 'Could not load your saved keywords.' });
  }
};

export const save_keywords: Controller = async (req, res) => {
  try {
    const user = req.user as User;
    const validation = validateKeywordLists(req.body);
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    await atsKeywordsModel.save(user.id, validation.value);
    return res.status(200).json({ success: true, keywords: validation.value });
  } catch (error) {
    console.error('Failed to save ATS keywords:', error);
    return res.status(500).json({ success: false, error: 'Could not save your keywords.' });
  }
};
```

- [ ] **Step 4: Add the routes**

Replace the contents of `server/src/routes/ats.ts` with:

```ts
import express from "express";
import scan_resume from "../controllers/ats";
import { get_keywords, save_keywords } from "../controllers/atsKeywords";
import { isAuthenticated, validateSocialLogin } from '../middlewares/auth';
import { atsRateLimit, uploadResume } from '../middlewares/ats';

const atsRouter = express.Router();

// Stateless: the uploaded PDF is scanned in memory and never stored.
// Auth runs first so the rate limit can count per user.
atsRouter.post('/scan',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  atsRateLimit,
  uploadResume,
  scan_resume
);

// Saved keyword lists (only the keywords are stored, never the resume). Not rate limited like scans.
atsRouter.get('/keywords',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  get_keywords
);
atsRouter.put('/keywords',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  save_keywords
);

export default atsRouter;
```

- [ ] **Step 5: Type-check the server**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the migration up, down, up**

Run: `cd server && yarn migrate && yarn migrate:rollback && yarn migrate`
Expected: the table is created, dropped and created again. (Needs the local MySQL from `.env`. If it is unreachable, report the migration as **unverified** instead of claiming it works. Rollback undoes only the latest batch, so confirm the output names only this migration.)

- [ ] **Step 7: Check the model against the real DB (temporary script)**

Create `server/src/tmp-kw-check.ts` (do not commit):

```ts
import knex from './db/knex';
import { atsKeywordsModel } from './models/AtsKeywords';

(async () => {
  const id = 'tmp-kw-check-user';
  await knex('users').insert({ id, email: 'tmp-kw@example.com', name: 'Tmp' }).onConflict('id').ignore();
  console.log('empty:', await atsKeywordsModel.get(id));
  await atsKeywordsModel.save(id, { active: ['CRM'], suggested: ['React'] });
  await atsKeywordsModel.save(id, { active: ['CRM', 'Sales'], suggested: [] });
  console.log('saved:', await atsKeywordsModel.get(id));
  await knex('users').where('id', id).del();
  console.log('after user delete:', await knex('ats_keyword_preferences').where('user_id', id).first());
  await knex.destroy();
})();
```

Run: `cd server && npx ts-node -r tsconfig-paths/register src/tmp-kw-check.ts` (if `tsconfig-paths` is not installed, run `npx ts-node src/tmp-kw-check.ts`; the script uses only relative imports).
Expected: `empty: { active: [], suggested: [] }`, `saved: { active: ['CRM','Sales'], suggested: [] }` (second save replaced the first, no duplicate-row error), `after user delete: undefined` (cascade). If the `users` insert fails on a NOT NULL column, add the missing column to the script. Delete the script afterwards.

- [ ] **Step 8: Commit**

```bash
git add server/src/db/migrations/20261014090000_create_ats_keyword_preferences_table.js server/src/models/AtsKeywords.ts server/src/controllers/atsKeywords.ts server/src/routes/ats.ts
git commit -m "feat(ats): add saved keyword preferences API

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Client list operations

**Files:**
- Create: `client/src/components/ats/keywords.ts`
- Test (temporary): `client/src/components/ats/keywords.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const MAX_TERM_LENGTH = 40; export const MAX_ACTIVE = 100; export const MAX_SUGGESTED = 200;
  export interface KeywordLists { active: string[]; suggested: string[] }
  export const EMPTY_LISTS: KeywordLists;
  export const normalizeTerm: (raw: string) => string;
  export const splitInput: (raw: string) => string[];
  export interface ListChange { lists: KeywordLists; error?: string }
  export const addKeywords: (lists: KeywordLists, raw: string) => ListChange;
  export const removeKeyword: (lists: KeywordLists, term: string) => KeywordLists;
  export const restoreSuggestion: (lists: KeywordLists, term: string) => ListChange;
  export const deleteSuggestion: (lists: KeywordLists, term: string) => KeywordLists;
  export const clearSuggestions: (lists: KeywordLists) => KeywordLists;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// client/src/components/ats/keywords.test.ts
import { describe, expect, it } from 'vitest';
import {
  EMPTY_LISTS, MAX_ACTIVE, MAX_SUGGESTED, MAX_TERM_LENGTH,
  addKeywords, clearSuggestions, deleteSuggestion, normalizeTerm, removeKeyword, restoreSuggestion, splitInput,
} from './keywords';

const lists = (active: string[], suggested: string[] = []) => ({ active, suggested });

describe('normalizeTerm / splitInput', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeTerm('  Lead   generation ')).toBe('Lead generation');
  });
  it('splits on commas, semicolons and newlines and drops empties', () => {
    expect(splitInput('CRM, crm;  Lead   generation\nSales,, ')).toEqual(['CRM', 'crm', 'Lead generation', 'Sales']);
  });
});

describe('addKeywords', () => {
  it('adds terms, deduping case-insensitively and keeping the first spelling', () => {
    const r = addKeywords(EMPTY_LISTS, 'CRM, crm, Sales');
    expect(r.lists.active).toEqual(['CRM', 'Sales']);
    expect(r.error).toBeUndefined();
  });
  it('ignores a term already active', () => {
    expect(addKeywords(lists(['CRM']), 'crm').lists.active).toEqual(['CRM']);
  });
  it('moves a term out of suggestions when it is added again', () => {
    const r = addKeywords(lists([], ['React', 'Vue']), 'react');
    expect(r.lists).toEqual(lists(['react'], ['Vue']));
  });
  it('skips over-long terms with an error but adds the rest', () => {
    const r = addKeywords(EMPTY_LISTS, `${'a'.repeat(MAX_TERM_LENGTH + 1)}, Sales`);
    expect(r.lists.active).toEqual(['Sales']);
    expect(r.error).toMatch(/40/);
  });
  it('stops at the active limit with an error', () => {
    const full = lists(Array.from({ length: MAX_ACTIVE }, (_, i) => `t${i}`));
    const r = addKeywords(full, 'extra');
    expect(r.lists.active).toHaveLength(MAX_ACTIVE);
    expect(r.error).toMatch(String(MAX_ACTIVE));
  });
  it('does nothing for blank input', () => {
    expect(addKeywords(lists(['A']), '  ,  ').lists).toEqual(lists(['A']));
  });
});

describe('removeKeyword', () => {
  it('moves the term to the front of suggestions', () => {
    expect(removeKeyword(lists(['A', 'B'], ['Z']), 'A')).toEqual(lists(['B'], ['A', 'Z']));
  });
  it('drops the oldest suggestion when full', () => {
    const sugg = Array.from({ length: MAX_SUGGESTED }, (_, i) => `s${i}`);
    const r = removeKeyword(lists(['A'], sugg), 'A');
    expect(r.suggested).toHaveLength(MAX_SUGGESTED);
    expect(r.suggested[0]).toBe('A');
    expect(r.suggested).not.toContain(`s${MAX_SUGGESTED - 1}`);
  });
  it('is a no-op for an unknown term', () => {
    expect(removeKeyword(lists(['A']), 'nope')).toEqual(lists(['A']));
  });
});

describe('restoreSuggestion / deleteSuggestion / clearSuggestions', () => {
  it('restores a suggestion to active', () => {
    expect(restoreSuggestion(lists(['A'], ['B', 'C']), 'B').lists).toEqual(lists(['A', 'B'], ['C']));
  });
  it('refuses to restore past the active limit', () => {
    const full = lists(Array.from({ length: MAX_ACTIVE }, (_, i) => `t${i}`), ['B']);
    const r = restoreSuggestion(full, 'B');
    expect(r.lists).toEqual(full);
    expect(r.error).toBeDefined();
  });
  it('deletes one suggestion permanently', () => {
    expect(deleteSuggestion(lists(['A'], ['B', 'C']), 'B')).toEqual(lists(['A'], ['C']));
  });
  it('clears all suggestions', () => {
    expect(clearSuggestions(lists(['A'], ['B', 'C']))).toEqual(lists(['A'], []));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd client && npx vitest run src/components/ats/keywords.test.ts`
Expected: FAIL (cannot resolve `./keywords`).

- [ ] **Step 3: Write the implementation**

```ts
// client/src/components/ats/keywords.ts
// Pure operations on the user's two keyword lists. Limits mirror server/src/utils/atsKeywords.ts.
export const MAX_TERM_LENGTH = 40;
export const MAX_ACTIVE = 100;
export const MAX_SUGGESTED = 200;

export interface KeywordLists {
  active: string[];
  suggested: string[];
}

export interface ListChange {
  lists: KeywordLists;
  error?: string;
}

export const EMPTY_LISTS: KeywordLists = { active: [], suggested: [] };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const without = (list: string[], term: string) => list.filter((t) => !same(t, term));

export const normalizeTerm = (raw: string): string => raw.trim().replace(/\s+/g, ' ');

/** Splits pasted text on commas, semicolons and line breaks. */
export const splitInput = (raw: string): string[] =>
  raw.split(/[,;\n\r]+/).map(normalizeTerm).filter((t) => t.length > 0);

export const addKeywords = (lists: KeywordLists, raw: string): ListChange => {
  let active = lists.active;
  let suggested = lists.suggested;
  let error: string | undefined;

  for (const term of splitInput(raw)) {
    if (term.length > MAX_TERM_LENGTH) {
      error = `Keywords can be at most ${MAX_TERM_LENGTH} characters long.`;
      continue;
    }
    if (active.some((t) => same(t, term))) continue;
    if (active.length >= MAX_ACTIVE) {
      error = `You can track up to ${MAX_ACTIVE} keywords.`;
      break;
    }
    active = [...active, term];
    suggested = without(suggested, term);
  }
  return { lists: { active, suggested }, error };
};

/** Removing a chip keeps it as a suggestion (newest first) so it can be brought back with one click. */
export const removeKeyword = (lists: KeywordLists, term: string): KeywordLists => {
  const existing = lists.active.find((t) => same(t, term));
  if (!existing) return lists;
  const suggested = [existing, ...without(lists.suggested, existing)].slice(0, MAX_SUGGESTED);
  return { active: without(lists.active, existing), suggested };
};

export const restoreSuggestion = (lists: KeywordLists, term: string): ListChange => {
  const existing = lists.suggested.find((t) => same(t, term));
  if (!existing) return { lists };
  if (lists.active.length >= MAX_ACTIVE) {
    return { lists, error: `You can track up to ${MAX_ACTIVE} keywords.` };
  }
  return { lists: { active: [...lists.active, existing], suggested: without(lists.suggested, existing) } };
};

export const deleteSuggestion = (lists: KeywordLists, term: string): KeywordLists => ({
  active: lists.active,
  suggested: without(lists.suggested, term),
});

export const clearSuggestions = (lists: KeywordLists): KeywordLists => ({ active: lists.active, suggested: [] });
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd client && npx vitest run src/components/ats/keywords.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit (source only)**

```bash
git add client/src/components/ats/keywords.ts
git commit -m "feat(ats): add keyword list operations

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Client matcher

**Files:**
- Create: `client/src/components/ats/keyword-match.ts`
- Test (temporary): `client/src/components/ats/keyword-match.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface KeywordMatchResult { matched: string[]; missing: string[]; percent: number }
  export const matchKeywords: (text: string, keywords: string[]) => KeywordMatchResult;
  ```
  `percent` is an integer 0 to 100; it is `0` (not `NaN`) when `keywords` is empty.

- [ ] **Step 1: Write the failing test**

```ts
// client/src/components/ats/keyword-match.test.ts
import { describe, expect, it } from 'vitest';
import { matchKeywords } from './keyword-match';

const m = (text: string, kws: string[]) => matchKeywords(text, kws);

describe('matchKeywords', () => {
  it('matches case-insensitively and keeps keyword order', () => {
    const r = m('Experienced in CRM and Salesforce.', ['salesforce', 'CRM', 'Excel']);
    expect(r.matched).toEqual(['salesforce', 'CRM']);
    expect(r.missing).toEqual(['Excel']);
    expect(r.percent).toBe(67);
  });
  it('matches multi-word phrases across line breaks and hyphens', () => {
    expect(m('Drove lead\ngeneration programs', ['lead generation']).matched).toEqual(['lead generation']);
    expect(m('Full-stack developer', ['full stack']).matched).toEqual(['full stack']);
  });
  it('does not match inside longer words', () => {
    expect(m('I know JavaScript', ['Java']).missing).toEqual(['Java']);
    expect(m('Assistant role', ['sis']).missing).toEqual(['sis']);
  });
  it('treats C, C++, C# and .NET as distinct whole terms', () => {
    expect(m('Wrote C++ and C# code', ['C']).missing).toEqual(['C']);
    expect(m('Wrote C++ and C# code', ['C++', 'C#']).matched).toEqual(['C++', 'C#']);
    expect(m('Built on .NET Core', ['.NET']).matched).toEqual(['.NET']);
    expect(m('Built with Node.js', ['Node.js']).matched).toEqual(['Node.js']);
    expect(m('Owned the P&L for EMEA', ['P&L']).matched).toEqual(['P&L']);
    expect(m('Set up CI/CD pipelines', ['CI/CD']).matched).toEqual(['CI/CD']);
  });
  it('normalizes simple word forms', () => {
    expect(m('Managing a team of six', ['manage']).matched).toEqual(['manage']);
    expect(m('Managed vendors', ['managing']).matched).toEqual(['managing']);
    expect(m('Closed enterprise deals', ['deal']).matched).toEqual(['deal']);
  });
  it('matches known acronym pairs both ways', () => {
    expect(m('Used customer relationship management tools', ['CRM']).matched).toEqual(['CRM']);
    expect(m('Tracked KPIs weekly', ['key performance indicators']).matched).toEqual(['key performance indicators']);
  });
  it('handles empty text and empty keywords without NaN', () => {
    expect(m('', ['CRM'])).toEqual({ matched: [], missing: ['CRM'], percent: 0 });
    expect(m('some text', [])).toEqual({ matched: [], missing: [], percent: 0 });
    expect(m('   \n ', ['CRM']).percent).toBe(0);
  });
  it('ignores blank keywords and keywords made only of punctuation', () => {
    const r = m('CRM', ['CRM', '  ', '---']);
    expect(r.matched).toEqual(['CRM']);
    expect(r.missing).toEqual([]);
    expect(r.percent).toBe(100);
  });
  it('matches punctuation-adjacent words', () => {
    expect(m('Skills: SQL, Excel; (Tableau).', ['SQL', 'Excel', 'Tableau']).matched).toEqual(['SQL', 'Excel', 'Tableau']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd client && npx vitest run src/components/ats/keyword-match.test.ts`
Expected: FAIL (cannot resolve `./keyword-match`).

- [ ] **Step 3: Write the implementation**

```ts
// client/src/components/ats/keyword-match.ts
// Plain text matching of the user's keywords against the text an ATS read from the resume. Exact wording only,
// plus simple word-form normalization and a few acronym pairs. No AI.

export interface KeywordMatchResult {
  matched: string[];
  missing: string[];
  percent: number;
}

// Each row lists phrases that mean the same thing.
const ALIASES: string[][] = [
  ['crm', 'customer relationship management'],
  ['kpi', 'key performance indicator'],
  ['b2b', 'business to business'],
  ['b2c', 'business to consumer'],
  ['saas', 'software as a service'],
  ['p&l', 'profit and loss'],
  ['roi', 'return on investment'],
  ['seo', 'search engine optimization'],
  ['hr', 'human resources'],
  ['qa', 'quality assurance'],
  ['ui', 'user interface'],
  ['ux', 'user experience'],
  ['api', 'application programming interface'],
  ['erp', 'enterprise resource planning'],
  ['sop', 'standard operating procedure'],
];

// Words with letters, digits and inner . or & (node.js, p&l), plus a trailing ++ / # / + (c++, c#) or a leading dot
// (.net). Hyphens and slashes split words, so "full-stack" equals "full stack" and "ci/cd" is "ci cd".
const TOKEN = /\.?[a-z0-9]+(?:[.&][a-z0-9]+)*(?:\+\+|#|\+)?/g;

/** Crude stemming so manage / managed / managing and deal / deals line up. Only plain alphabetic words. */
const stem = (word: string): string => {
  if (!/^[a-z]{4,}$/.test(word)) return word;
  let w = word;
  if (w.endsWith('ies') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) w = w.slice(0, -1);
  return w.endsWith('e') ? w.slice(0, -1) : w;
};

const tokenize = (text: string): string[] =>
  (text.toLowerCase().replace(/[-/]/g, ' ').match(TOKEN) ?? []).map(stem);

/** A padded token string, so "a b" can be found with includes() without matching inside other words. */
const toKey = (text: string): string => {
  const tokens = tokenize(text);
  return tokens.length === 0 ? '' : ` ${tokens.join(' ')} `;
};

const ALIAS_GROUPS: string[][] = ALIASES.map((group) => group.map(toKey));

const variantsOf = (keyword: string): string[] => {
  const key = toKey(keyword);
  if (key === '') return [];
  const group = ALIAS_GROUPS.find((g) => g.includes(key));
  return group ?? [key];
};

export const matchKeywords = (text: string, keywords: string[]): KeywordMatchResult => {
  const textKey = toKey(text);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of keywords) {
    const variants = variantsOf(keyword);
    if (variants.length === 0) continue; // blank or punctuation-only
    (variants.some((v) => textKey.includes(v)) ? matched : missing).push(keyword);
  }

  const total = matched.length + missing.length;
  return { matched, missing, percent: total === 0 ? 0 : Math.round((matched.length / total) * 100) };
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd client && npx vitest run src/components/ats/keyword-match.test.ts`
Expected: all PASS. If a case fails, fix the implementation and not the test, unless the test itself is wrong. Notable cases to reason about: `"Assistant"` must not contain `"sis"` because matching is on whole tokens; `c` stays `c` and never equals `c++`; `"KPIs"` stems to `kpi`; `"indicators"` stems to `indicator`, which is why the `kpi` alias row uses the singular.

- [ ] **Step 5: Commit (source only)**

```bash
git add client/src/components/ats/keyword-match.ts
git commit -m "feat(ats): add keyword matcher

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: API client and preferences hook

**Files:**
- Create: `client/src/components/ats/keyword-api.ts`
- Create: `client/src/components/ats/useKeywordPreferences.ts`

**Interfaces:**
- Consumes: `KeywordLists`, `EMPTY_LISTS` from `./keywords`; `client` from `@/api/axiosInstance`; `getCsrfToken` from `@/utils/helper`.
- Produces:
  ```ts
  export const fetchKeywords: () => Promise<KeywordLists>;
  export const saveKeywords: (lists: KeywordLists) => Promise<void>;
  export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  export interface KeywordPreferences {
    lists: KeywordLists;
    loadState: 'loading' | 'ready' | 'failed';
    saveStatus: SaveStatus;
    update: (next: KeywordLists) => void;   // optimistic; schedules a debounced save
    retryLoad: () => void;
    retrySave: () => void;
  }
  export const useKeywordPreferences: () => KeywordPreferences;
  ```

- [ ] **Step 1: Write the API module**

```ts
// client/src/components/ats/keyword-api.ts
import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import type { KeywordLists } from './keywords';

export const fetchKeywords = async (): Promise<KeywordLists> => {
  const response = await client.get<{ success: boolean; keywords: KeywordLists }>('/ats/keywords');
  return response.data.keywords;
};

export const saveKeywords = async (lists: KeywordLists): Promise<void> => {
  await getCsrfToken();
  await client.put('/ats/keywords', lists);
};
```

- [ ] **Step 2: Write the hook**

Rules it must satisfy: (1) `update` is ignored until `loadState === 'ready'`, so a failed load can never cause an empty list to overwrite stored data; (2) saves are debounced 600 ms; (3) only one save runs at a time, and if edits arrive during a save the latest lists are saved right after it, so saves cannot land out of order; (4) pending edits are flushed when the page unmounts.

```ts
// client/src/components/ats/useKeywordPreferences.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchKeywords, saveKeywords } from './keyword-api';
import { EMPTY_LISTS, type KeywordLists } from './keywords';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface KeywordPreferences {
  lists: KeywordLists;
  loadState: 'loading' | 'ready' | 'failed';
  saveStatus: SaveStatus;
  update: (next: KeywordLists) => void;
  retryLoad: () => void;
  retrySave: () => void;
}

const SAVE_DELAY_MS = 600;

export const useKeywordPreferences = (): KeywordPreferences => {
  const [lists, setLists] = useState<KeywordLists>(EMPTY_LISTS);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const latest = useRef<KeywordLists>(EMPTY_LISTS);
  const dirty = useRef(false); // edits not yet sent
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);

  const flush = useCallback(async () => {
    if (inFlight.current || !dirty.current) return;
    inFlight.current = true;
    dirty.current = false;
    if (mounted.current) setSaveStatus('saving');
    try {
      await saveKeywords(latest.current);
      if (mounted.current && !dirty.current) setSaveStatus('saved');
    } catch (error) {
      console.error('Saving ATS keywords failed:', error);
      dirty.current = true; // keep the edits so Retry can send them
      if (mounted.current) setSaveStatus('error');
      inFlight.current = false;
      return;
    }
    inFlight.current = false;
    if (dirty.current) void flush(); // edits arrived during the save: send the newest lists next
  }, []);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const loaded = await fetchKeywords();
      if (!mounted.current) return;
      latest.current = loaded;
      setLists(loaded);
      setLoadState('ready');
    } catch (error) {
      console.error('Loading ATS keywords failed:', error);
      if (mounted.current) setLoadState('failed');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      if (dirty.current) void flush(); // do not lose the last edit when leaving the page
    };
  }, [load, flush]);

  const update = useCallback(
    (next: KeywordLists) => {
      if (loadState !== 'ready') return; // never save over stored data we failed to load
      latest.current = next;
      dirty.current = true;
      setLists(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [loadState, flush],
  );

  const retrySave = useCallback(() => void flush(), [flush]);

  return { lists, loadState, saveStatus, update, retryLoad: () => void load(), retrySave };
};
```

- [ ] **Step 3: Type-check and lint**

Run: `cd client && npx tsc -b && npx eslint src/components/ats/keyword-api.ts src/components/ats/useKeywordPreferences.ts`
Expected: no errors. (`react-hooks/exhaustive-deps` must be clean; if it flags `load`/`flush` in the effect, they are already in the dependency array.)

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ats/keyword-api.ts client/src/components/ats/useKeywordPreferences.ts
git commit -m "feat(ats): add keyword preferences hook

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: KeywordBox component and styles

**Files:**
- Create: `client/src/components/ats/KeywordBox.tsx`
- Modify: `client/src/styles/ats.css` (append)

**Interfaces:**
- Consumes: list operations from `./keywords`, `KeywordPreferences` from `./useKeywordPreferences`.
- Produces: `export default function KeywordBox(props: { prefs: KeywordPreferences; onChange?: (lists: KeywordLists) => void })`. It renders the whole box (heading, chips, input, suggestions, status). `prefs.update` is called on every change.

- [ ] **Step 1: Append the styles**

Append to `client/src/styles/ats.css`:

```css
/* Keyword box and match */
.kw-field {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.625rem;
  border: 1px solid var(--l-hair-strong);
  border-radius: 10px;
  background: transparent;
}
.kw-field:focus-within { border-color: var(--l-accent); outline: 2px solid var(--l-accent); outline-offset: 1px; }
.kw-input {
  min-width: 10rem;
  min-height: 2rem;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--l-ink);
  font: inherit;
}
.kw-chip {
  display: inline-flex;
  max-width: 100%;
  min-height: 2rem;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.25rem 0 0.625rem;
  border: 1px solid var(--l-hair-strong);
  border-radius: 6px;
  background: var(--l-surface);
  color: var(--l-ink);
  font-size: 0.875rem;
}
.kw-chip__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kw-chip__x {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--l-muted);
  cursor: pointer;
}
.kw-chip__x:hover { color: var(--l-ink); }
.kw-chip--suggest { padding: 0; border-style: dashed; background: transparent; }
.kw-chip--suggest .kw-chip__add {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.25rem 0 0.625rem;
  border: 0;
  background: transparent;
  color: var(--l-ink);
  font: inherit;
  cursor: pointer;
}
.kw-chip--suggest:hover { border-color: var(--l-accent); }
.kw-chip__x:focus-visible, .kw-chip__add:focus-visible, .kw-link:focus-visible { outline: 2px solid var(--l-accent); outline-offset: 2px; }
.kw-link {
  border: 0;
  background: transparent;
  color: var(--l-muted);
  font: inherit;
  font-size: 0.8125rem;
  text-decoration: underline;
  cursor: pointer;
}
.kw-bar-fill { background: var(--l-accent); }
```

- [ ] **Step 2: Write the component**

```tsx
// client/src/components/ats/KeywordBox.tsx
import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  addKeywords, clearSuggestions, deleteSuggestion, MAX_ACTIVE, removeKeyword, restoreSuggestion,
} from './keywords';
import type { KeywordPreferences } from './useKeywordPreferences';

const SAVE_TEXT = { idle: '', saving: 'Saving...', saved: 'Saved', error: "Couldn't save your changes." } as const;

export default function KeywordBox({ prefs }: { prefs: KeywordPreferences }) {
  const { lists, loadState, saveStatus, update } = prefs;
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState(''); // inline error
  const [announce, setAnnounce] = useState(''); // screen reader updates

  if (loadState === 'loading') {
    return <p className="l-muted m-0 text-sm">Loading your saved keywords...</p>;
  }
  if (loadState === 'failed') {
    return (
      <div className="app-card p-4">
        <p className="l-ink m-0 text-sm">We couldn't load your saved keywords. They have not been changed.</p>
        <button type="button" className="l-btn l-btn--ghost mt-3" onClick={prefs.retryLoad}>
          Try again
        </button>
      </div>
    );
  }

  const commit = (raw: string) => {
    if (raw.trim() === '') return;
    const change = addKeywords(lists, raw);
    setMessage(change.error ?? '');
    if (change.lists !== lists) {
      update(change.lists);
      setAnnounce(`Added. ${change.lists.active.length} keywords.`);
    }
    setDraft('');
  };

  const handleRemove = (term: string) => {
    update(removeKeyword(lists, term));
    setMessage('');
    setAnnounce(`${term} removed. Kept in suggestions.`);
  };

  const handleRestore = (term: string) => {
    const change = restoreSuggestion(lists, term);
    setMessage(change.error ?? '');
    if (change.lists !== lists) {
      update(change.lists);
      setAnnounce(`${term} added back.`);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor={inputId} className="l-ink text-sm font-semibold">
          Keywords to look for
        </label>
        <p className="l-muted m-0 mt-0.5 text-sm">
          Skills, tools or phrases from the job you want. Separate with commas, or paste a list.
        </p>
      </div>

      <div className="kw-field" onClick={() => document.getElementById(inputId)?.focus()}>
        {lists.active.map((term) => (
          <span key={term} className="kw-chip">
            <span className="kw-chip__label">{term}</span>
            <button type="button" className="kw-chip__x" aria-label={`Remove ${term}`} onClick={() => handleRemove(term)}>
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className="kw-input"
          value={draft}
          placeholder={lists.active.length === 0 ? 'e.g. CRM, lead generation, SQL' : 'Add another'}
          autoComplete="off"
          onChange={(e) => {
            const value = e.target.value;
            // A paste or a typed comma commits immediately; plain typing waits for Enter.
            if (/[,;\n]/.test(value)) commit(value);
            else setDraft(value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(draft);
            } else if (e.key === 'Backspace' && draft === '' && lists.active.length > 0) {
              handleRemove(lists.active[lists.active.length - 1]);
            }
          }}
          onBlur={() => commit(draft)}
        />
      </div>

      <div className="flex min-h-5 flex-wrap items-center justify-between gap-2 text-sm">
        <span className={message ? 'ats-fail' : 'l-muted'} role={message ? 'alert' : undefined}>
          {message || `${lists.active.length} of ${MAX_ACTIVE} keywords`}
        </span>
        <span className={saveStatus === 'error' ? 'ats-fail' : 'l-muted'} aria-live="polite">
          {SAVE_TEXT[saveStatus]}
          {saveStatus === 'error' && (
            <>
              {' '}
              <button type="button" className="kw-link" onClick={prefs.retrySave}>
                Retry
              </button>
            </>
          )}
        </span>
      </div>

      {lists.suggested.length > 0 && (
        <section aria-label="Suggestions">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="l-eyebrow l-muted m-0">Suggestions · removed earlier</h3>
            <button type="button" className="kw-link" onClick={() => update(clearSuggestions(lists))}>
              Clear suggestions
            </button>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {lists.suggested.map((term) => (
              <li key={term} className="kw-chip kw-chip--suggest">
                <button type="button" className="kw-chip__add" onClick={() => handleRestore(term)}>
                  <Plus aria-hidden="true" className="size-3.5" />
                  <span className="kw-chip__label">{term}</span>
                  <span className="sr-only">Add back</span>
                </button>
                <button
                  type="button"
                  className="kw-chip__x"
                  aria-label={`Delete suggestion ${term}`}
                  onClick={() => update(deleteSuggestion(lists, term))}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}
```

Note: an `<li>` with `className="kw-chip kw-chip--suggest"` holds two buttons; the `.kw-chip` border wraps both. The hooks (`useId`, `useState`) run before the early returns' `if` branches, which keeps hook order stable.

- [ ] **Step 3: Type-check and lint**

Run: `cd client && npx tsc -b && npx eslint src/components/ats/KeywordBox.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ats/KeywordBox.tsx client/src/styles/ats.css
git commit -m "feat(ats): add keyword chip box

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Results section and page integration

**Files:**
- Create: `client/src/components/ats/KeywordMatch.tsx`
- Modify: `client/src/components/ats/ScanResults.tsx`
- Modify: `client/src/pages/ATSScanner.tsx`

**Interfaces:**
- Consumes: `matchKeywords` (Task 4), `KeywordBox` (Task 6), `KeywordPreferences` (Task 5).
- Produces: `KeywordMatch({ text, prefs })`; `ScanResults` gains a required prop `keywords: KeywordPreferences`.

- [ ] **Step 1: Write the results section**

```tsx
// client/src/components/ats/KeywordMatch.tsx
import { useMemo } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import KeywordBox from './KeywordBox';
import { matchKeywords } from './keyword-match';
import type { KeywordPreferences } from './useKeywordPreferences';

export default function KeywordMatch({ text, prefs }: { text: string; prefs: KeywordPreferences }) {
  const { matched, missing, percent } = useMemo(
    () => matchKeywords(text, prefs.lists.active),
    [text, prefs.lists.active],
  );
  const total = matched.length + missing.length;

  return (
    <section aria-labelledby="kw-match-title" className="app-card flex flex-col gap-4 p-5">
      <div>
        <h3 id="kw-match-title" className="l-eyebrow l-muted m-0">
          Keyword match
        </h3>
        <p className="l-muted m-0 mt-1 text-xs">Based on exact wording. Edit the list to re-check instantly.</p>
      </div>

      {total === 0 ? (
        <p className="l-muted m-0 text-sm">Add the keywords you want to check and the match appears here.</p>
      ) : (
        <>
          <div>
            <p className="m-0 flex items-baseline gap-1 whitespace-nowrap">
              <span className="ats-score">{percent}%</span>
              <span className="l-muted">{`${matched.length} of ${total} found`}</span>
            </p>
            <div
              className="ats-bar mt-3"
              role="progressbar"
              aria-label="Keyword match"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i className="ats-bar__fill kw-bar-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>

          {missing.length > 0 && (
            <div>
              <h4 className="l-ink m-0 mb-2 text-sm font-semibold">{`Missing · ${missing.length}`}</h4>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {missing.map((term) => (
                  <li key={term} className="ats-chip ats-warn">
                    <CircleAlert aria-hidden="true" className="size-4" />
                    <span className="sr-only">Missing: </span>
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {matched.length > 0 && (
            <div>
              <h4 className="l-ink m-0 mb-2 text-sm font-semibold">{`Found · ${matched.length}`}</h4>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {matched.map((term) => (
                  <li key={term} className="ats-chip ats-pass">
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">Found: </span>
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="l-border border-t pt-4">
        <KeywordBox prefs={prefs} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add it to `ScanResults`**

In `client/src/components/ats/ScanResults.tsx`:

Add imports:
```tsx
import KeywordMatch from './KeywordMatch';
import type { KeywordPreferences } from './useKeywordPreferences';
```
Change the props interface and signature:
```tsx
interface ScanResultsProps {
  result: ScanResult;
  fileName: string;
  keywords: KeywordPreferences;
  onReset: () => void;
}

export default function ScanResults({ result, fileName, keywords, onReset }: ScanResultsProps) {
```
In the left column, add the match section after `FindingsList`:
```tsx
          <VerdictCard result={result} />
          <FindingsList checks={result.checks} />
          <KeywordMatch text={result.extractedText} prefs={keywords} />
```

- [ ] **Step 3: Integrate into `ATSScanner.tsx`**

Add imports:
```tsx
import KeywordBox from '@/components/ats/KeywordBox';
import { useKeywordPreferences } from '@/components/ats/useKeywordPreferences';
```
Call the hook inside the component, right after the other `useState` calls:
```tsx
  const keywords = useKeywordPreferences();
```
Pass it to results (replace the existing `<ScanResults ... />` line):
```tsx
            <ScanResults result={result} fileName={file?.name ?? 'Your resume'} keywords={keywords} onReset={handleReset} />
```
Show the box before the scan. In the idle block, add it after `<IdleSteps />`:
```tsx
                  <ScanDropzone maxSizeMb={MAX_FILE_SIZE_MB} onFile={handleFileSelected} />
                  <IdleSteps />
                  <div className="app-card p-5">
                    <KeywordBox prefs={keywords} />
                  </div>
                  <PrivacyNote />
```
and in the selected state, add it after the scan button block, before the `phase === 'selected'` privacy note:
```tsx
              {phase === 'selected' && (
                <>
                  <div className="app-card p-5">
                    <KeywordBox prefs={keywords} />
                  </div>
                  <PrivacyNote />
                </>
              )}
```
(replace the existing `{phase === 'selected' && <PrivacyNote />}` line). The box is intentionally not shown while scanning.

- [ ] **Step 4: Type-check, lint and build**

Run: `cd client && npx tsc -b && npx eslint src/components/ats src/pages/ATSScanner.tsx && yarn build`
Expected: no errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ats/KeywordMatch.tsx client/src/components/ats/ScanResults.tsx client/src/pages/ATSScanner.tsx
git commit -m "feat(ats): show keyword match on the scanner page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Privacy copy, final verification and cleanup

**Files:**
- Modify: `client/src/components/ats/privacy-copy.ts`
- Delete: all temporary test files and any temp scripts

- [ ] **Step 1: Update the privacy copy**

The privacy policy ([client/src/pages/PrivacyPolicy.tsx](../../../client/src/pages/PrivacyPolicy.tsx)) already covers information users provide while using the service, and states "We do not sell your personal information". Replace the constant in `privacy-copy.ts`:

```ts
// Verified against the code and the policy: the upload is held in memory only (multer.memoryStorage, stateless
// route, local pdfjs-dist scanning); only the user's saved keyword lists are stored (ats_keyword_preferences), and the
// privacy policy says "We do not sell your personal information".
// It also allows sharing with service providers, legal authorities and with consent, so do NOT say "never shared".
export const PRIVACY_COPY = {
  note: 'Your PDF is read in memory to build this report and is not stored. Keywords you save are kept with your account. We do not sell your personal information.',
  link: 'Read the Privacy Policy',
} as const;
```

- [ ] **Step 2: Run all temporary tests once more**

Run: `cd server && npx vitest run src/utils/atsKeywords.test.ts` and `cd client && npx vitest run src/components/ats`
Expected: all PASS (the existing client tests, if any, still pass too).

- [ ] **Step 3: Full checks**

Run: `cd client && npx tsc -b && yarn lint && yarn build` and `cd server && npx tsc --noEmit`
Expected: clean. (If `yarn lint` reports pre-existing errors in untouched files, note them and confirm none are in files this plan touched.)

- [ ] **Step 4: Browser check**

Start the app and use a temporary harness or the real page. The scanner needs sign-in, which cannot be automated here, so check what can be checked: render `KeywordBox` and `KeywordMatch` with fake `prefs` in a throwaway page, in light and dark at 375, 768 and 1440 px. Confirm: chips wrap without horizontal scroll, the suggestion chip's two buttons are both reachable by Tab, Enter and comma add chips, pasting `CRM, Sales` makes two chips, Backspace on an empty input removes the last chip into Suggestions, focus rings are visible, and missing/found never rely on color alone. Delete the harness afterwards. Anything that needs a real sign-in (the saved lists surviving a reload, the "couldn't load" state with the server stopped) is **left for the user to click through once**; say so in the final report.

- [ ] **Step 5: Delete temporary files**

```bash
rm -f server/src/utils/atsKeywords.test.ts server/src/tmp-kw-check.ts client/src/components/ats/keywords.test.ts client/src/components/ats/keyword-match.test.ts
git status --short
```
Expected: no test files or harness files listed; only intended changes remain.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ats/privacy-copy.ts
git commit -m "feat(ats): mention saved keywords in the privacy note

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage:** chips-only input and normalization (Tasks 3, 6); suggestions on removal, restore, per-item delete, clear (Tasks 3, 6); limits 40/100/200 with oldest dropped (Tasks 1, 3); saved per user with `GET`/`PUT` and table (Tasks 1, 2); matching with boundaries, `C++`/`C#`/`.NET`/`Node.js`, stemming, aliases, "exact wording" (Tasks 4, 7); before-scan and in-results placement with instant re-match (Task 7); auto-save with saved/saving/failed and retry (Tasks 5, 6); accessibility (labels, live regions, focus rings, progressbar role, text + icon) (Tasks 6, 7); privacy sentence (Task 8); verification and cleanup (Task 8). Deviation recorded: hand-written validation replaces zod (no new dependency).
- **Placeholders:** none; every code step has full code.
- **Type consistency:** `KeywordLists`, `ListChange`, `KeywordPreferences`, `SaveStatus`, `matchKeywords`, `validateKeywordLists` and the prop names are used identically across tasks. Client and server limit constants match (40/100/200).
- **Review Focus coverage:** item 1 → hook guard (Task 5) plus the failed-load branch in `KeywordBox` (Task 6); 2 → Task 3 tests; 3 → Task 4 tests; 4 → Task 4 tests and the empty state in Task 7; 5 → hook serialization (Task 5), checked by review as it needs timers and the network, not by a unit test.
