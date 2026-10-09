# Resume Section Ordering - Design

Date: 2026-10-10

## Goal

Let users choose the order of resume sections per resume. Template design (markup, CSS, headings) does not change; only which section appears where. Single-column templates get one sortable list. Column-based templates get a column board where sections can also move between columns, except sections pinned to a side by the template.

## Confirmed requirements

- Header and contact info are fixed and not movable.
- Movable sections: summary, socials, experience, education, skills, projects, awards, certifications, references, languages, interests (limited per template to what that template renders; `comet` renders only summary, skills, projects, interests).
- Single-column templates (zeus, hera, cigar, milky_way, comet): one draggable list.
- Column templates (andromeda, artemis, hermes: Summary and Experience pinned left; athena, apollo: pinned right): board with one column per template column, in visual left-to-right order. Drag within a column and across columns.
- **Summary and Experience are fully fixed** in column templates: they keep both their column and their exact default slot, cannot be dragged, and the user arranges the other sections around them. They can only be repositioned by switching to a single-column template.
- A resume with no saved layout renders exactly as today. For hermes and andromeda the existing experience-count rules (visible experience entries: hermes References left if < 3 else right; andromeda Education/Languages/Certifications/Interests placement at <= 2) remain the default for the free sections until the user saves a layout; a saved layout overrides them.
- Switching templates:
  - Column -> single-column: flatten columns concatenated left to right (e.g. left [Summary, Experience, Education], right [Projects, Skills, Certifications] becomes Summary, Experience, Education, Projects, Skills, Certifications).
  - Single-column -> column template: pinned sections (Summary, Experience) go to the template's pinned column at their default slots, ignoring their position in the flat list. Free sections keep their relative saved order and are placed in their template default columns.
  - Column -> column follows the same two rules as flatten followed by place.
- Skipped/empty sections stay hidden as they are today (no data or all items `hidden`).
- Form section order in `ResumeForm.tsx` is out of scope and unchanged.

## Data

`ResumeFormData` gains optional `sectionLayout: { columns: SectionId[][] }` (columns in visual left-to-right order; single-column templates use `columns[0]`). The resume is stored as an opaque JSON blob in `user_resume_data.resume_data`, so there is no migration or server change; `/clone` copies it verbatim. The yup schema in `client/src/schema/schema.ts` and the load/merge logic in `ResumeForm.tsx` must pass the field through untouched. The layout is not a react-hook-form field: it is held in Preview state and merged into the data on save/render.

## Layout module

New pure module `client/src/utils/section-layout.ts`:

- `SectionId` union and section registry (id, label).
- Per-template config: column count, supported sections, per-section default column and default slot, pinned set (`summary`, `experience` for column templates). hermes/andromeda defaults are computed from data (experience-count rules).
- `resolveLayout(template, saved, data): SectionId[][]` - returns final columns. Pinned sections always at their default column and slot; free sections fill remaining slots in saved order; sections missing from the saved layout are appended to their default column; unknown or unsupported ids are dropped.
- `convertLayout(saved, fromTemplate, toTemplate): SectionLayout` - implements the switching rules above.
- `isDefaultLayout` / reset helper.

## Template rendering

Each of the 10 templates keeps its existing section JSX consts. The hardcoded list is replaced by a lookup from section id to the existing JSX, rendered in the order returned by `resolveLayout` (per column for column templates). Default output must be byte-for-byte equivalent in structure to today's. Header and contact blocks are untouched (in apollo/artemis/athena contact info stays in the sidebar).

## UI

- New icon-only button with tooltip "Section order" in the `Preview.tsx` header, immediately before the Templates button; toggles a right sidebar.
- New `SectionOrderPanel` using `@dnd-kit` (already installed): one `SortableContext` for single-column, one per column for column templates with cross-column drops; pointer and keyboard sensors. Pinned sections render as non-draggable. Sections with no data are dimmed but still movable. A "Reset to default" action clears `sectionLayout`.
- Each change starts a 2.5 s debounce, then saves and regenerates the PDF via the existing `handleFormSubmit` path (save-data, `renderToString`, `/resume/generate`), reusing the `requestIdRef` stale-response guard.
- On template change, `convertLayout` is applied to the saved layout.

## Error handling and edge cases

- Invalid or partial saved layouts are normalised by `resolveLayout`; the UI never crashes on bad data.
- Rapid drags coalesce into one regeneration via the debounce; older in-flight PDFs are dropped.
- Layout persists with clone and export because it lives in `resume_data`.

## Testing

- Add Vitest as a dev dependency for the pure `section-layout` module only. Cover: defaults per template (including hermes/andromeda dynamic rules), the flatten example above, single-column -> column pinned placement (andromeda -> cigar -> athena round trip), unknown/missing ids, pinned immutability.
- Verify default PDF/HTML output is unchanged for all 10 templates; manual drag testing per template type; `tsc -b` and eslint pass.

## Out of scope

Reordering the editor form sections, hiding whole sections, per-template stored layouts, moving header or contact info, changing template visuals.
