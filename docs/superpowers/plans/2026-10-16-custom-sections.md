# Custom Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users add their own named sections (e.g. "Volunteer Work", "Publications") whose entries have a title, description and a required start month/year with an optional end date, and have them behave like built-in sections everywhere (editor, reorder panel, preview, PDF, public share).

**Architecture:** Custom sections live in a new `ResumeFormData.customSections` array. Each gets the layout id `custom:<id>`, so the existing layout, hide, collapse and reorder machinery keeps working once `SectionId` is widened. Templates render them through one shared helper that takes the template's own CSS class names. The server needs no schema change, only a fix to the public-share stripping.

**Tech Stack:** React + Vite + react-hook-form + yup + dnd-kit (client), Express/Knex (server), vitest.

**Spec:** No separate spec doc. Requirements come from the brainstorming conversation (2026-10-16) and are copied under Global Constraints.

## Global Constraints

- Entry fields: `title` (text), `description` (rich text via `EditorComponent`, like Experience), `startDate` (`"YYYY-MM"`, **required**), `hasEndDate` (**toggle**), `stillOngoing` (**checkbox**, shown only when `hasEndDate` is on), `endDate` (`"YYYY-MM"`, shown only when `hasEndDate` is on and `stillOngoing` is off).
- Section field: `title` (the section name the user types, max 40 chars, required).
- Date display: `hasEndDate` off -> `Mar 2024`; on + ongoing -> `Mar 2024 – Present`; on + ended -> `Mar 2024 – Aug 2024`. Use `parseMonthYear` from `client/src/utils/helper.ts`.
- Multiple custom sections per resume. Built-in sections and Experience's empty-`endDate`-means-Present convention stay unchanged.
- Custom sections support section-level hide (`hiddenSections`), per-entry hide (`hidden`), collapse, reordering via the existing panel, and all 10 templates.
- Hidden custom sections and hidden entries must never leave the server on public share links.
- Test files are allowed during development but must be deleted before any commit (user rule). Do not create branches, push, or open PRs.

## Review Focus

- Deleting a custom section that is in `sectionLayout.columns` or `hiddenSections` must not crash or leave a ghost section (layout self-heals).
- A saved `custom:<id>` in `sectionLayout` after a template switch lands in a valid column of the new template.
- A section with a name but zero visible entries renders nothing (no empty heading) in preview and PDF.
- An old saved resume with no `customSections` key loads and saves without error.
- A title typed with upper-case-forcing templates (hermes, apollo) still shows exactly as typed.

---

### Task 1: Data model and date formatting

**Files:**
- Modify: `client/src/types/interface.resume-form-data.ts`
- Modify: `client/src/utils/section-layout.ts` (the `SectionId` type and `SECTION_LABELS` only)
- Create: `client/src/utils/custom-sections.ts`
- Test (temporary): `client/src/utils/custom-sections.test.ts`

**Interfaces:**
- Produces, in `custom-sections.ts`:
  - `type CustomSectionEntry = { title: string; description?: string; startDate: string; hasEndDate: boolean; stillOngoing: boolean; endDate?: string; hidden?: boolean }`
  - `type CustomSection = { id: string; title: string; entries: CustomSectionEntry[] }`
  - `const CUSTOM_ID_PREFIX = 'custom:'`
  - `customSectionId(id: string): CustomId`
  - `isCustomId(value: unknown): value is CustomId`
  - `findCustomSection(data: Pick<ResumeFormData,'customSections'>, sectionId: SectionId): CustomSection | undefined`
  - `formatEntryDate(entry: CustomSectionEntry): string`
  - `newCustomSection(): CustomSection` (random `id`, empty title and entries)
- `section-layout.ts` now exports `BuiltInSectionId` (the old 11-member union), `type CustomId = \`custom:${string}\``, and `SectionId = BuiltInSectionId | CustomId`. `SECTION_LABELS` becomes `Record<BuiltInSectionId, string>`.
- `ResumeFormData` gains `customSections?: CustomSection[]`.

- [ ] **Step 1: Write the failing test** for `formatEntryDate`: `{startDate:'2024-03',hasEndDate:false}` -> `"Mar 2024"`; `hasEndDate:true, stillOngoing:true` -> `"Mar 2024 – Present"`; `hasEndDate:true, stillOngoing:false, endDate:'2024-08'` -> `"Mar 2024 – Aug 2024"`. Also `isCustomId('custom:abc')` is true and `isCustomId('experience')` is false.
- [ ] **Step 2: Run** `cd client && npx vitest run src/utils/custom-sections.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the types and helpers above. Widen `SectionId`, retype `SECTION_LABELS`, keep `ALL_SECTION_IDS` as built-ins only. Fix the TypeScript errors this causes in other files with minimal casts to `BuiltInSectionId` (full custom support comes in later tasks).
- [ ] **Step 4: Run** the test, then `cd client && npx tsc -b --noEmit`. Expected: PASS, no type errors.
- [ ] **Step 5: Commit** `feat(custom-sections): add data model and date formatting` (exclude the test file).

### Task 2: Layout, titles and collapse awareness

**Files:**
- Modify: `client/src/utils/section-layout.ts`, `client/src/utils/section-titles.ts`, `client/src/utils/section-collapse.ts`
- Test (temporary): `client/src/utils/section-layout.custom.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: no new exports; behavior changes in `getDefaultColumns`, `hasContent`, `isSectionId`/`distributeFree`, `getSectionTitle`, `hasTitle`, `titleClassName`, `createCollapseStore` id filter.

- [ ] **Step 1: Write failing tests** using a data fixture with `customSections: [{id:'a', title:'Volunteer Work', entries:[<one visible entry>]}]`:
  - `getDefaultColumns('zeus', data)[0]` ends with `'custom:a'`; for a two-column template it is appended to the **last** column.
  - `getRenderColumns('zeus', data)` contains `'custom:a'`; after hiding all entries, or adding `'custom:a'` to `hiddenSections`, it does not.
  - `resolveLayout` with a saved layout containing `'custom:gone'` (no such section) drops it without throwing; `'custom:a'` in a saved column keeps its position.
  - `convertLayout(saved, 'hermes', data)` keeps `'custom:a'` somewhere in the output.
  - `getSectionTitle('zeus','custom:a',data)` returns `'Volunteer Work'`; `hasTitle` is true for it.
- [ ] **Step 2: Run** the test file. Expected: FAIL.
- [ ] **Step 3: Implement.** `getDefaultColumns` appends `data.customSections` ids to the last default column. `hasContent` handles custom ids (not hidden, at least one entry without `hidden`). `isSectionId` accepts built-ins or any `custom:` string; stale ids are already discarded because `distributeFree` only keeps ids in the defaults. `getSectionTitle`/`hasTitle`/`titleClassName` treat a custom id's title as always "custom" (so `CUSTOM_TITLE_CLASS` applies and upper-casing is suppressed). The collapse store's valid-id filter accepts `custom:` ids.
- [ ] **Step 4: Run** tests and `npx tsc -b --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(custom-sections): make layout, titles and collapse custom-aware`.

### Task 3: Validation schema

**Files:**
- Modify: `client/src/schema/schema.ts`
- Test (temporary): `client/src/schema/custom-sections.schema.test.ts`

**Interfaces:**
- Produces: a `customSections` entry in the yup schema.

- [ ] **Step 1: Write failing tests** against the exported schema: section with empty `title` is invalid; entry without `startDate` is invalid; `hasEndDate:true, stillOngoing:false` without `endDate` is invalid; same with `stillOngoing:true` and no `endDate` is valid; `endDate` earlier than `startDate` is invalid; `hasEndDate:false` is valid with no `endDate`; title over 40 chars is invalid.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the schema (array of `{id, title: string().required().max(40), entries: array of {title required, description optional, startDate required, hasEndDate boolean, stillOngoing boolean, endDate conditional, hidden optional}}`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(custom-sections): add validation schema`.

### Task 4: Public share privacy

**Files:**
- Modify: `server/src/utils/publicResumeData.ts`
- Test (temporary): `server/src/utils/publicResumeData.test.ts`

- [ ] **Step 1: Write failing tests** on `stripHiddenContent`: JSON whose `hiddenSections` contains `'custom:a'` has the section with `id:'a'` removed from `customSections`; a visible custom section keeps its entries except those with `hidden:true`; JSON without `customSections` is unchanged; `hiddenSections` containing a built-in key still behaves as before.
- [ ] **Step 2: Run** `cd server && npx vitest run src/utils/publicResumeData.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** in `stripHiddenContent`: after the existing loop, filter `customSections` to drop sections whose `custom:<id>` is in `hiddenSections` and drop `hidden === true` entries inside the rest. Update the file's top comment.
- [ ] **Step 4: Run.** Expected: PASS. Also `npx tsc --noEmit` in `server`.
- [ ] **Step 5: Commit** `fix(public-share): strip hidden custom sections and entries`.

### Task 5: Shared template renderer and all 10 templates

**Files:**
- Create: `client/src/components/templates/custom-section.tsx`
- Modify: `client/src/components/templates/render-sections.tsx`
- Modify: `client/src/components/templates/column-variants.tsx` if its wrappers are typed on built-ins only
- Modify: all templates in `client/src/components/templates/greek/*.tsx` and `galaxy/*.tsx` (zeus, hera, athena, artemis, apollo, hermes, andromeda, cigar, comet, milky_way)

**Interfaces:**
- Produces in `custom-section.tsx`:
  - `interface CustomSectionClasses { section: string; title: string; item: string; itemHeader: string; itemTitle: string; itemDate: string; itemDescription: string }`
  - `renderCustomSections(data: ResumeFormData, t: TemplateTitles, classes: CustomSectionClasses, wrap?: (id: CustomId, node: React.ReactNode) => React.ReactNode): SectionMap`. Returns one `custom:<id>` node per custom section, using `formatEntryDate`, skipping hidden entries, reusing the heading with `t.cls(classes.title, id)` and `t.text(id)`.
- Each template spreads `...renderCustomSections(data, t, {...its own class names})` into its `sections` map. Templates whose built-in sections go through `MainSection`/`SidebarSection` pass them as `wrap` so custom sections land in the same chrome.

- [ ] **Step 1: Read** each template's existing Experience block to copy its class names (zeus mapping: `greek-section`, `greek-section-title`, `greek-item`, `greek-item-header`, `greek-item-title`, `greek-item-date`, `greek-item-description`).
- [ ] **Step 2: Implement** `custom-section.tsx` and add it to each template, one template at a time.
- [ ] **Step 3: Verify** with a temporary render test that calls `renderToString` of every template with a fixture containing one custom section and asserts the output contains the section name, `Mar 2024 – Present` and the entry title; and with `hiddenSections:['custom:a']` asserts the name is absent.
- [ ] **Step 4: Run** the test and `npx tsc -b --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(custom-sections): render custom sections in all templates`.

### Task 6: Editor form

**Files:**
- Create: `client/src/components/forms/CustomSections.tsx`
- Modify: `client/src/components/ResumeForm.tsx`, `client/src/components/forms/entry-validation.ts`

**Interfaces:**
- Consumes: Task 1 types, Task 3 schema, existing `SectionHeader`/`SectionBody`/`SectionControls`, `MonthPicker`, `EditorComponent`, `validateEntry`.
- Produces: `CustomSections` component rendering, per custom section, a `SectionHeader` (with that section's `controlsFor('custom:<id>')`), a Section Name input, and a sortable card list of entries following `Experience.tsx`: title input, `MonthPicker` for start (month and year required), a **toggle** "Has end date" (shadcn `Switch` if present in `components/ui`, else a styled button with `role="switch"`), a **checkbox** "Still ongoing" shown only when the toggle is on, an end `MonthPicker` shown only when the toggle is on and the checkbox is off, rich-text description, per-entry hide, Add Entry, and Remove Section (also removes the id from `hiddenSections`).
- An "Add custom section" button appears below the built-in sections.

- [ ] **Step 1: Extend** `EntrySection` in `entry-validation.ts` for custom entries.
- [ ] **Step 2: Implement** `CustomSections.tsx`. Switching the toggle off clears `stillOngoing` and `endDate`. Checking "Still ongoing" clears `endDate`.
- [ ] **Step 3: Integrate** in `ResumeForm.tsx`: `useFieldArray` for `customSections`, default `customSections: []` when merging saved data from localStorage, make `controlsFor` and `handleInvalid` accept custom ids, remove the ids of deleted sections from `hiddenSections`.
- [ ] **Step 4: Run** `npx tsc -b --noEmit` and `npm run build` in `client`. Expected: no errors.
- [ ] **Step 5: Commit** `feat(custom-sections): add editor form`.

### Task 7: Reorder panel, section rail and Preview wiring

**Files:**
- Modify: `client/src/components/SectionOrderPanel.tsx`, `client/src/components/SectionTitleField.tsx`, `client/src/components/editor-chrome/SectionRail.tsx`, `client/src/pages/Preview.tsx`

- [ ] **Step 1: Panel:** label lookups use the custom section's `title` (fallback "Untitled section") for `custom:` ids. The inline rename field is not shown for custom sections because the name is edited in the form (my call).
- [ ] **Step 2: Rail and refs:** `Preview.tsx` builds refs and rail items for each custom section dynamically and passes them to `ResumeForm`; the rail jumps to it.
- [ ] **Step 3: Regenerate:** adding, renaming, removing or editing custom entries triggers the same preview regeneration as the built-in sections.
- [ ] **Step 4: Run** `npx tsc -b --noEmit` and `npm run build`. Expected: clean.
- [ ] **Step 5: Commit** `feat(custom-sections): wire reorder panel, rail and preview`.

### Task 8: Docs, cleanup and manual checklist

**Files:**
- Modify: `docs/feature-roadmap.md` (mark item 9 done)
- Delete: every temporary `*.test.ts` created above (user rule)

- [ ] **Step 1:** Remove temporary tests; `git status` shows none.
- [ ] **Step 2:** Run `npm run build` in `client` and `server`; both pass.
- [ ] **Step 3:** Update the roadmap entry.
- [ ] **Step 4: Commit** `docs: mark custom sections as shipped`.
- [ ] **Step 5:** Give the user a manual UI checklist (user tests UI themselves): add a section "Volunteer Work"; add one dated single entry, one ongoing, one ended; verify the three date formats in preview and exported PDF; drag the section in the reorder panel; hide the section and one entry; switch templates; delete the section; open a public share link and confirm hidden items are absent.
