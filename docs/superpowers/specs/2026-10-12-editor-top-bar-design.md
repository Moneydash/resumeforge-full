# Resume Editor (Preview Page) Redesign, Scope A - Design

Date: 2026-10-12
Branch: `preview-page-revamp` (cut from `page-revamp` at `07bb1f2`; the PR for `page-revamp` is separate)

## Goal

Restyle the chrome of the resume editor ([client/src/pages/Preview.tsx](../../../client/src/pages/Preview.tsx), route `/preview`) in the language of the other redesigned pages: warm neutrals, one quiet accent, no gradients. The user chose the **single top bar** layout from the mockups (over "keep today's layout, reskinned"), because it looks clean and sleek.

This is the riskiest page of the redesign: 771 lines, 44 hooks, live PDF regeneration, debounced layout saves, a resizable sidebar, section refs that drive scroll navigation, and **no automated tests**. The design therefore changes **markup and styling only**; the behavior stays byte-for-byte.

## Scope

**In scope (scope A, chrome only):** the page background and root, a new single top bar, the left section rail, the form column header and resize handle, the preview canvas and its generating and empty states, and the page's full-screen loading state.

**Out of scope (later, separately):** the Design panel and its tabs (Sections, Color, Font, Templates), the form fields themselves (`ResumeForm` and its class strings), the resume template renderers (the actual resume output), the PDF generation, the cover letter editor (`/cl-preview`, which will reuse the new top bar afterwards), and everything on other pages.

## Confirmed requirements

- **Single top bar** across the whole editor, above the rail, form column and preview. Left side: the ResumeForge mark and name, a quiet separator, the template name as a mono eyebrow (`Executive Classic`, from the same value the page shows today), and the live-save status as a dot plus text. Right side: **Design** (icon button, `aria-pressed`, disabled until a PDF exists, active state shown with an ink border instead of the indigo ring), **Dashboard** (ghost button), **Export PDF** (primary ink button, spinner and "Exporting..." while exporting, disabled without a PDF) and the theme toggle.
- **Live-save status** keeps its exact states and texts: "Saving & updating preview..." (with a small spinner), "All changes saved", "Update failed, will retry on next edit"; shown only when `liveEdit && liveStatus !== 'idle'`. The dot is green for saved, neutral while updating and red for the error; the text always carries the meaning.
- **Preview column** is just the canvas: a calm neutral background with the PDF page on it (hairline border, one soft shadow). No header any more. Its generating state ("Generating your PDF preview...") and empty state ("No PDF generated yet") keep their wording, restyled as quiet hairline boxes.
- **Form column** keeps a small header (mono eyebrow "Edit resume") above the scrolling form; the brand, theme toggle and template pill leave it for the top bar. The resize handle keeps its behavior and gets a hairline look (the grip shows on hover and while dragging).
- **Left rail** keeps its 12 section buttons and the scroll-to-section behavior, restyled to the neutral tokens. Each button gets an `aria-label` and its label appears on hover **and on keyboard focus** (today the tooltips are hover-only and unlabeled for assistive tech).
- **Full-screen loading state** ("Loading your resume...") reuses the shared loader look (mark, thin moving bar, label) through an optional `label` prop on `SuspenseLoader`; the default stays "Loading".
- **Theme:** light and dark follow the existing theme toggle through the shared tokens (`.app-shell` scope, which already has the dark values). The `isDarkMode` color ternaries in the chrome are replaced by tokens. `isDarkMode` itself stays (the Design panel still receives it).
- **Layout stays stable:** the root stays `h-screen` flex column with `overflow-hidden`; the top bar is a fixed-height, non-shrinking first child; the existing content container keeps `flex-1` and now simply has the remaining height. The rail, which is `fixed` today, starts below the bar. The sidebar width logic, `window.innerWidth` checks, the Design panel width arithmetic and the mobile stacking (form over preview below `lg`) are unchanged. On narrow screens the top bar drops the status and template text and shows icon-only buttons (accessible names stay).

## What must not change (the behavior contract)

Everything above the `return (` of the component stays identical: every state, ref, effect, handler, request and constant. The JSX keeps wiring the same handlers with the same arguments (`handleExportPDF({ ...resumeData, sectionLayout: ..., sectionTitles: ..., fontFamily: ..., colorTheme: ... })`, `redirectResumes`, `setDesignOpen`, `scrollToSection`, `startResize`, `handleFormSubmit`, the Design panel's props), and keeps `id="exportButton"` exactly once.

## Implementation structure

- `client/src/components/editor-chrome/EditorTopBar.tsx`: presentational, props only: `templateLabel`, `status` (`'idle' | 'updating' | 'saved' | 'error'`, already folded with `liveEdit` by the page), `designOpen`, `canOpenDesign`, `onToggleDesign`, `onDashboard`, `onExport`, `exporting`, `canExport`. It renders the theme toggle itself and keeps `id="exportButton"` on the export button. Reusable by the cover letter editor later.
- `client/src/components/editor-chrome/SectionRail.tsx`: presentational: `items` (`{ icon, label, ref }[]`, exactly the page's `sidebarItems`) and `onSelect(ref)` (the page's `scrollToSection`). It renders the labeled, keyboard-friendly rail.
- `client/src/components/editor-chrome/status.ts`: `liveStatusLabel(status)` and `statusTone(status)` as pure helpers (texts above), unit-testable.
- `client/src/styles/editor-chrome.css` (new; the existing `client/src/styles/editor.css` belongs to the Lexical text editor and is not touched): the top bar, rail, column header, resize handle, canvas and state boxes; tokens come from `.app-shell`.
- `client/src/pages/Preview.tsx`: markup only. The root div gets the `app-shell` class, the old rail, form header and preview header JSX is replaced by the two components, and the canvas and state boxes are restyled. No logic line changes.
- `client/src/components/SuspenseLoader.tsx`: optional `label` prop (default "Loading").

## Delivery: small slices, one commit each

1. **Components and styles** (no page change yet): `EditorTopBar`, `SectionRail`, `status.ts`, `editor-chrome.css`, the loader `label`, with their tests.
2. **Top bar in the page:** root `app-shell` scope, the top bar inserted, the old preview header and the form header's brand, theme and template pill removed, the rail offset below the bar. This is the structural slice.
3. **Rail:** the old rail replaced by `SectionRail`.
4. **Form header, resize handle and canvas:** restyled, including the generating and empty states.
5. **Loading state:** "Loading your resume..." through the shared loader.

After every slice the user gets this click-through checklist: open `/preview` with a resume that has saved data, edit a field and watch the preview update and the status change; toggle Design; switch template from the Design panel; change font, color and section order; resize the sidebar; click Dashboard; Export PDF; check dark mode; check a narrow window.

## Safety nets

- **Logic fingerprint (temporary guard test):** a hash of the text of `Preview.tsx` from `const Preview: React.FC = () => {` up to (not including) `  return (`, captured from the current commit. The test fails if any character of the logic section changes. It is run after every slice.
- **Wiring checks (temporary tests):** `id="exportButton"` appears once; the export handler call keeps its exact arguments; the other handlers are still referenced in the JSX.
- **Component tests (temporary):** the top bar (labels, `aria-pressed`, disabled states, each status, exporting), the rail (labels, keyboard-reachable buttons), the status helpers, the loader `label`.
- `tsc -b`, lint and a production build after every slice.
- Test files are deleted before each commit; commits stage explicit paths only.
- Every slice is one commit, so any slice can be reverted on its own.

## Verification limits

I cannot sign in or run the live PDF generation, so the click-through flows above are verified by the user after each slice. Automated checks prove the logic region is untouched, the new components behave, and the build is healthy; they do not prove the visual layout, which is why the slices are small.

## Out of scope reminders

The Design panel will look slightly different from the new chrome until scope B; that is expected. The cover letter editor keeps its current look until it gets the same treatment with the same components.

## Note on folder naming

`client/src/components/editor/` already holds the Lexical text editor (`editor-ui`, `themes`), so the new components live in `client/src/components/editor-chrome/`.
