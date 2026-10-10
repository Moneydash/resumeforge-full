# Font Customization - Design

Date: 2026-10-10
Branch: `text-and-color-theme-customization` (all work happens on this branch; no new branch or worktree)

## Goal

Decouple fonts from templates. Today every resume and cover letter template hard-codes its own font in its CSS, and the PDF servers carry a second, separate template-to-font map. Users should be able to pick any font from a curated, professional list and apply it to any template. The font applies to the whole document. Each template keeps its current font as its default until the user changes it. The choice is saved with the document data and is honoured by the live preview, the exported PDF, and the saved/cloned data.

Color theming is a separate, later feature and is out of scope here.

## Confirmed requirements

- Applies to both **resume templates** (10) and **cover letter templates** (5).
- The chosen font applies to all text in the document (headings, body, contact info, everything). Font Awesome icons are not text and must keep working.
- Curated list of **18 entries**: 17 single fonts plus one named **pairing**, "DM Serif Text + Cinzel" (below). Ubuntu is removed from the product.
- A font entry has two roles: a **body font** (all content) and a **heading font** (the document name and section titles such as Experience, Projects). A single font uses itself for both roles. The pairing uses Cinzel for headings and DM Serif Text for body, and is selectable on **every** template: choosing it on Athena puts Cinzel on Athena's section titles and name, and DM Serif Text on the content under them.
- Each template has a default font (below). A document with no saved font choice renders with its template default.
- The choice is saved in the document's JSON data (`user_resume_data.resume_data` for resumes, `user_cover_letter_data.cover_letter_data` for cover letters; both are text JSON columns), so it survives reload, clone and export. No DB migration.
- A "Reset to template default" action clears the choice.
- Preview and exported PDF must always use the same font (no more preview/PDF drift).

## Font list (18 entries)

| Id | Name | Kind | Source |
|---|---|---|---|
| geist | Geist | sans | existing (Hera, Ignis) |
| ibm-plex-sans | IBM Plex Sans | sans | existing (Ventus) |
| ibm-plex-serif | IBM Plex Serif | serif | existing (Andromeda) |
| poppins | Poppins | sans | existing (Apollo, Comet, Terra) |
| lato | Lato | sans | existing (Milky Way) |
| montserrat | Montserrat | sans | existing (Aether) |
| lexend-deca | Lexend Deca | sans | existing (Athena) |
| dm-serif-text | DM Serif Text | serif | existing (Zeus, Cigar) |
| roboto-slab | Roboto Slab | serif | existing (PDF-only for Artemis today) |
| mozilla-headline | Mozilla Headline | sans (display) | existing (Aqua) |
| inter | Inter | sans | new |
| source-sans-3 | Source Sans 3 | sans | new |
| roboto | Roboto | sans | new |
| open-sans | Open Sans | sans | new |
| merriweather | Merriweather | serif | new |
| lora | Lora | serif | new |
| libre-baskerville | Libre Baskerville | serif | new |
| dm-serif-text-cinzel | DM Serif Text + Cinzel | pairing (heading: Cinzel, body: DM Serif Text) | existing (Zeus) |

Cinzel is not offered on its own (it is all-caps and display-only); it exists only as the heading half of the pairing. Plain DM Serif Text stays as its own entry because Cigar uses it alone.

Mozilla Headline is a display-style font and the least conservative entry; it stays only because every font in use today is retained. It can be dropped by removing one registry entry.

## Template defaults

| Template | Default font | Change from today |
|---|---|---|
| cigar | DM Serif Text | none |
| **zeus** | **DM Serif Text + Cinzel** (pairing) | same fonts as the CSS asks for; the PDF now actually loads Cinzel |
| andromeda | IBM Plex Serif | none |
| comet, apollo | Poppins | none |
| milky_way | Lato | none |
| athena | Lexend Deca | none |
| hera | Geist | none |
| **hermes** | **Roboto Slab** | was Ubuntu |
| **artemis** | **Source Sans 3** | was Ubuntu (CSS) / Roboto Slab (PDF) |
| aether | Montserrat | none |
| aqua | Mozilla Headline | none |
| ignis | Geist | none |
| terra | Poppins | none |
| **ventus** | **IBM Plex Sans** | PDF was IBM Plex Serif; now matches its CSS |

Hermes, Artemis, the Ventus PDF and the Zeus PDF headings (now real Cinzel instead of a generic serif fallback) change visibly. Everything else renders as it does today.

## Design

### 1. Font registry (client and server)

Each package gets a small module exporting the same data (they are separate packages, so it is duplicated, with a test on each side that asserts every template default id exists in the registry):

- `FONTS`: `{ id, name, kind: 'sans' | 'serif' | 'pairing', bodyStack, headingStack, googleHrefs }`. `bodyStack` is the full CSS value for content (e.g. `'Inter', sans-serif`). `headingStack` is the value for the document name and section titles; for single fonts it equals `bodyStack`. `googleHrefs` is the list of Google Fonts CSS URLs needed (one for a single font, two for the pairing: DM Serif Text and Cinzel), with the weights/italics the current links already use.
- `TEMPLATE_DEFAULT_FONT`: map from template id (resume and cover letter) to font id (table above).
- `resolveFontId(template, saved)`: returns `saved.id` if `saved` is present, its `template` matches the active template, and the id is in the registry; otherwise the template default.

Client path: `client/src/utils/fonts.ts`. Server path: `server/src/utils/fonts.ts`.

### 2. Template CSS: variable with the old font as fallback

Two CSS variables, one per role. Every resume and cover letter template CSS file is edited:

- **Body role.** Each `font-family: <stack>` declaration on content becomes `font-family: var(--doc-font, <stack>)`, keeping any `!important` and the original stack as the fallback.
- **Heading role.** The rules for the document **name** and the **section titles** (e.g. "Work Experience", "Projects") become `font-family: var(--doc-heading-font, var(--doc-font, <stack>))`. The chain means a single font (which sets both variables to the same value) and the no-choice default (neither variable set) both behave correctly. What counts as "name" and "section title" is identified per template by its existing class names (e.g. `.greek-name`, `.greek-section-title` in Zeus) while editing, and listed in the implementation plan. Item titles, dates and descriptions stay on the body role.
- A document with no choice renders exactly as before. Declarations that name a font only for non-text purposes are left alone (none expected; verified per file). Font Awesome icon rules are untouched.

Notes on specific files:

- `hermes.css`, `artemis.css`: the Ubuntu stack is replaced by the new default font's stack (Roboto Slab / Source Sans 3) as the fallback.
- `zeus.css` already uses Cinzel for the name, headline, section titles and item header rows, and DM Serif Text for the rest. Those four Cinzel rules take the heading role (an exception to "item headers stay body": it keeps the Zeus default identical in CSS terms), and the rest take the body role. Choosing the pairing on Zeus is therefore the same as the default.
- On every other template, choosing the pairing puts Cinzel on that template's name and section titles and DM Serif Text on the rest. Choosing a single font puts it on both roles everywhere.
- `andromeda.css` has an `@import` for IBM Plex Serif; it is removed since the PDF server now loads the font link.
- `cigar.css`, `milky_way.css`, `comet.css`, `index.css` Georgia/Garamond/Cambria entries are reviewed; any that are template body fonts get the variable, generic fallbacks stay.

### 3. Setting the variable

The PDF server sets both variables on `:root` in the document `<head>` (`:root { --doc-font: …; --doc-heading-font: … }`), only when the document has a valid saved choice for the active template. It has to be `:root`, not the template wrapper `div`: nine of the ten resume templates and all five cover letter templates set their font on `body`, which is an ancestor of the wrapper and cannot see a variable defined on it. The client therefore does not touch the template components or their markup, and default markup is byte-for-byte unchanged.

### 4. Data

- `ResumeFormData` and the cover letter form data gain optional `fontFamily: { template: string; id: FontId }`.
- Recording the template means a font chosen for one template is ignored (default used) after the user switches to a different template, and restored if they switch back. This matches the section-ordering behaviour (`sectionLayout.template`).
- Held in Preview / CLPreview state and merged into the data on save and render (not a react-hook-form field), exactly like `sectionLayout`. "Reset to template default" removes the key from the saved JSON.
- Clone copies the JSON verbatim, so the font choice is cloned.

### 5. PDF servers

- No payload change: the request body already carries the whole document as `data`, which includes `data.fontFamily` (see Data).
- `server/src/utils/pdfGenerator.ts` is not imported anywhere (dead duplicate of `controllers/pdf.ts`) and is deleted rather than migrated.
- Server, in `pdf.ts` and `cl-pdf.ts`: resolve the font from `data.fontFamily` and the template with the server registry (unknown, malformed or other-template values fall back to the template default), then emit a `<link>` for each of that entry's `googleHrefs` (one, or two for the pairing, so Cinzel is now actually loaded for Zeus and for any template using the pairing). The per-template link ladders in `pdf.ts` and `pdfGenerator.ts` and the fixed `FONT_CONFIGS` in `cl-pdf.ts` are deleted.
- `cl-pdf.ts` currently forces `body, * { font-family: … !important }`. That rule is dropped for cover letters; the template CSS variable now does the job, and it removes the risk of overriding icon fonts.
- The font id is validated server-side against a fixed allow-list, so it never reaches the HTML as free text.
- Existing wait logic (`networkidle0` plus `document.fonts.ready`) already waits for the font to load.

### 6. UI

- A new `FontPicker` component (lucide `Type` icon button with tooltip "Font", opening a popover) used in both `Preview.tsx` and `CLPreview.tsx` headers, placed next to the "Section order" button in the resume header.
- The popover lists the 18 entries grouped Sans / Serif / Pairings, each name rendered in its own typeface (the pairing's row shows its name with "Cinzel" headings over "DM Serif Text" body text), with a check on the active one and a "Template default" badge on the template's default. A "Reset to template default" action sits at the bottom.
- Fonts are loaded for the picker by lazily injecting one combined Google Fonts stylesheet the first time the popover opens (the picker is the only client place that needs the fonts; the document preview is the server-rendered PDF).
- Each pick starts the existing debounce, then saves and regenerates the PDF through the existing path (`save-data`, `renderToString`, generate), reusing the `requestIdRef` stale-response guard.

## Error handling and edge cases

- Saved font id no longer in the registry (e.g. a font removed later) or saved for another template: treated as no choice, the template default renders.
- Font fails to load in Puppeteer (network): the CSS fallback stack in the variable value (`'Inter', sans-serif`) keeps the document readable.
- Rapid font changes coalesce into one regeneration via the debounce; older in-flight PDFs are dropped.
- Existing documents have no `fontFamily` and render with the template default (plus the intentional Hermes/Artemis/Ventus default changes).

## Testing

- Registry tests (both packages): every `TEMPLATE_DEFAULT_FONT` id exists; every entry has at least one `googleHref`, a `bodyStack` and a `headingStack` (equal for single fonts, different for the pairing); `resolveFontId` handles missing, wrong-template, and unknown-id inputs.
- Server font-head builder tests (Vitest is added to the server as a dev dependency, as was done for the client): with a saved choice the output contains the `:root` variables and the right `<link>`s; with none it contains only the default font's links and no variables. The existing template snapshots are regenerated once; the diff must consist only of `font-family` declarations (plus the Hermes/Artemis fallback changes).
- A script-level check that no template CSS file still contains a raw `font-family:` without `var(--doc-font` or `var(--doc-heading-font`, and no file references Ubuntu.
- Manual: for one template of each family (resume and cover letter), pick several fonts, confirm the PDF preview and the downloaded PDF match, icons still render, reset restores the default, clone keeps the choice. `tsc -b` and eslint pass on client and server.

## Out of scope

Letting users build their own heading/body combinations (only the one curated pairing exists; more can be added as registry entries later), font size or weight controls, user-uploaded fonts, color theming (next feature), reordering or restyling templates beyond font-family.
