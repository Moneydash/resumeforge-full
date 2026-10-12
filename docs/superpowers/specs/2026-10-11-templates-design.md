# Templates Page Redesign - Design

Date: 2026-10-11
Branch: `page-revamp` (all work happens on this branch; no new branch or worktree)

## Goal

Redesign `/templates` ([client/src/pages/Templates.tsx](../../../client/src/pages/Templates.tsx)) in the language of the landing page, dashboards and ATS scanner: warm neutrals, one quiet accent, no gradients or emojis, bigger real previews as the centerpiece, and only claims the app can back up.

This page is a step in the editing flow: a user arrives from a resume that has no template yet (Edit on the dashboard), picks one, and continues to the preview and editor. It should make that one decision fast.

The current page is AI-template styling: gradient text and backgrounds, emojis used as icons (sparkles, galaxy, lightning, rocket), a very large hero, cards that lift, scale and zoom on hover, the same green-check feature list on every card, and a closing banner with unverifiable claims ("Join the Growing Community", "HR Approved"). It also loads every full-size snapshot (0.2 to 1.0 MB each, about 7 MB in total) as a CSS background.

Fourth page of the `page-revamp` effort after the landing page, the dashboards and the ATS scanner. Only `/templates` is in scope.

## Confirmed requirements

- **Layout:** inside the shared `AppShell` sidebar with **Resumes** active (the user chose this over a focused page without the sidebar). No back button is needed; the sidebar leads anywhere.
- **Grouped by collection (user's choice from mockups):** with "All" selected, each collection gets a quiet mono heading and a count ("Galaxy collection", "4 templates"; "Greek Gods collection", "6 templates"), then its grid. Selecting a collection shows only that group, with its heading.
- **Collection filter:** a labeled segmented control "All", "Galaxy", "Greek" with counts derived from the data (10, 4, 6), `aria-pressed` on each button.
- **No "coming soon" toast (user requirement):** all 10 templates are available, so the `available` check and its toast are removed from this page. (The `available` field stays in the data; the in-editor `TemplatesPanel` still reads it.)
- **Selecting a template navigates immediately with loading feedback** (same pattern as the dashboards): the clicked card's button shows a spinner and "Opening...", sets `aria-busy`, repeat clicks are ignored, and a loading toast is dismissed when the page unmounts. The 1.5 s fixed wait is removed.
- **Behavior kept exactly:** `resumeId` comes from `localStorage.getItem('id')`, else the `resumeId` query parameter; if there is none the page redirects to `/dashboard`; the resume data is fetched with `GET /resume/fetch-data/<resumeId>/<userId>` and stored in `localStorage.resumeFormData`; selecting a template stores `id` (the resume id) and `template` (the template id) in `localStorage` and goes to `/preview?template=<templateId>`.
- **Removed:** the hero, all gradients, emojis and icon fields in the UI, the per-card feature checklists, the hover state props, and the closing banner (including "HR Approved" and "Join the Growing Community"). The existing `Template.features` and `icon` data are not touched or shown here.
- **Copy honesty:** the only copy is the heading, the one-line subheading ("Pick a layout for your resume. You can change the template later from the editor." (true: the editor has a template picker)), collection headings with counts, and each template's existing name, category and description from the data.

## Page structure

1. **AppShell** (Resumes active), content full width with the dashboards' padding.
2. **Header**: h1 "Choose a template", the subheading, and the collection filter on the right (wraps below on small screens).
3. **Collections**: for each shown collection, an h2 row (mono eyebrow "Galaxy collection" or "Greek Gods collection" plus the count) with a hairline, then an auto-filling grid (`repeat(auto-fill, minmax(14rem, 1fr))`).
4. **Template card**: a 4:5 preview cropped from the top of the template, the name, the category, a two-line description, and a full-width **Use this template** button. Hover only darkens the border; no lift, scale or zoom.

## Visual system

Reuses the shared tokens through the existing `.app-shell` scope and the dashboard classes (`.app-card`, `.app-seg`, `.l-btn`). A small `client/src/styles/templates.css` adds only what is new (the 4:5 preview box, the collection heading row). The global shadcn theme and `landing.css` are not modified.

- Type, radius, hairlines and buttons as on the dashboards (44px-tall controls, 8px card radius, no shadows).
- Motion: color transitions only; the spinner respects `prefers-reduced-motion`.
- Accessibility: 4.5:1 contrast (shared tokens), visible focus rings, one h1 and h2 per collection, the filter is a `role="group"` with `aria-pressed` buttons, the card button has an accessible name that includes the template ("Use Modern Professional" via `aria-label`), preview images are decorative (`alt=""`) because the name sits next to them.

## Implementation structure

`Templates.tsx` stays the container (resume id, redirect, data fetch, selection and navigation) and renders a presentational `TemplatesView` inside `AppShell`.

- `client/src/components/template-picker/collections.ts`: `COLLECTIONS` (id, filter label, heading) and the pure `groupTemplates(templates, selected)` returning the groups to show (`selected` is `'all' | 'galaxy' | 'greek'`; groups keep the data order and empty groups are dropped).
- `client/src/components/template-picker/TemplateCard.tsx`, `CollectionFilter.tsx`, `TemplatesView.tsx`.
- `client/src/components/template-picker/template-previews.ts`: maps each template id to its medium preview image.
- `client/src/assets/template-previews/<id>.jpg` (10 files): medium previews, about 560px wide JPEG at quality 75, generated once from the existing full-size snapshots with Pillow (cropped to the same aspect as the page's cards by CSS, not by the image). Expected size is roughly 40 to 90 KB each, so the page drops from about 7 MB of images to well under 1 MB, and they load lazily with explicit width and height. The generation command is recorded in the plan; the generated images are committed.
- `client/src/components/TemplateCard.tsx` (the old card) is deleted: this page was its only importer.
- `client/src/routes.tsx`: one added condition hides the global fixed `Footer` on `/templates`.
- The full-size snapshots in `client/src/assets/snapshots/` are kept (they are the source for the previews and are no longer imported by any resume page afterwards; removing them is a separate decision for the user).

**Data flow:** unchanged API and `localStorage` use. Selection goes through `usePendingNavigation` (key `template:<id>`, message `Opening "<name>"...`, with the two `localStorage` writes in its `beforeNavigate` callback).

## Out of scope

- `/cl-templates` and every other page (the cover letter templates page will almost certainly follow the same pattern afterwards).
- Template data and types, the in-editor `TemplatesPanel`, the preview and editor pages.
- Deleting the full-size snapshots.
- Any new feature (search, sorting, a large preview modal).

## Verification

- `tsc -b`, lint and a production build pass.
- Temporary unit tests (the `node` environment with `react-dom/server`) cover `groupTemplates`, the card, the filter, the view and the page's first render.
- The real flow needs a signed-in session with a resume, so it is checked by the user clicking through once: arrive from a resume with no template, pick a template, land in the preview. A browser harness with fake data is available for visual checks if the user wants them.
- The generated previews are checked for size and dimensions with a script.
- All test files, any harness and snapshots of tests are deleted before committing; commits stage explicit paths only.
