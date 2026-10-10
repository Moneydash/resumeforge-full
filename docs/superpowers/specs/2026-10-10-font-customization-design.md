# Font Customization - Design

Date: 2026-10-10
Branch: `text-and-color-theme-customization` (all work happens on this branch; no new branch or worktree)

## Goal

Decouple fonts from templates. Today every resume and cover letter template hard-codes its own font in its CSS, and the PDF servers carry a second, separate template-to-font map. Users should be able to pick any font from a curated, professional list and apply it to any template. The font applies to the whole document. Each template keeps its current font as its default until the user changes it. The choice is saved with the document data and is honoured by the live preview, the exported PDF, and the saved/cloned data.

Color theming is a separate, later feature and is out of scope here.

## Confirmed requirements

- Applies to both **resume templates** (10) and **cover letter templates** (5).
- The chosen font applies to all text in the document (headings, body, contact info, everything). Font Awesome icons are not text and must keep working.
- Curated list of **17 fonts** (below). Ubuntu is removed from the product.
- Each template has a default font (below). A document with no saved font choice renders with its template default.
- The choice is saved in the document's JSON data (`user_resume_data.resume_data` for resumes, `user_cover_letter_data.cover_letter_data` for cover letters; both are text JSON columns), so it survives reload, clone and export. No DB migration.
- A "Reset to template default" action clears the choice.
- Preview and exported PDF must always use the same font (no more preview/PDF drift).

## Font list (17)

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

Mozilla Headline is a display-style font and the least conservative entry; it stays only because every font in use today is retained. It can be dropped by removing one registry entry.

## Template defaults

| Template | Default font | Change from today |
|---|---|---|
| cigar, zeus | DM Serif Text | none |
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

Hermes, Artemis and the Ventus PDF change visibly. Everything else renders as it does today.

## Design

### 1. Font registry (client and server)

Each package gets a small module exporting the same data (they are separate packages, so it is duplicated, with a test on each side that asserts every template default id exists in the registry):

- `FONTS`: `{ id, name, kind: 'sans' | 'serif', stack, googleHref }`, where `stack` is the full CSS value (e.g. `'Inter', sans-serif`) and `googleHref` is the Google Fonts CSS URL for that family (all weights/italics the current links already use).
- `TEMPLATE_DEFAULT_FONT`: map from template id (resume and cover letter) to font id (table above).
- `resolveFontId(template, saved)`: returns `saved.id` if `saved` is present, its `template` matches the active template, and the id is in the registry; otherwise the template default.

Client path: `client/src/utils/fonts.ts`. Server path: `server/src/utils/fonts.ts`.

### 2. Template CSS: variable with the old font as fallback

In every resume and cover letter template CSS file, each `font-family: <stack>` declaration becomes `font-family: var(--doc-font, <stack>)`, keeping any `!important` and the original stack as the fallback. A document with no choice therefore renders exactly as before; a choice only has to set one variable. Declarations that name a font only for non-text purposes are left alone (none expected; verified per file while editing). Font Awesome icon rules are untouched.

Notes on specific files:

- `hermes.css`, `artemis.css`: the Ubuntu stack is replaced by the new default font's stack (Roboto Slab / Source Sans 3) as the fallback.
- `zeus.css` uses Cinzel for headings and DM Serif Text for body. Cinzel is not in the list. In default mode it keeps Cinzel in the fallback; when the user picks a font, that font replaces both. (Cinzel is not loaded by the PDF server today, so default PDFs already fall back to a generic serif for those headings; this is unchanged and not fixed here.)
- `andromeda.css` has an `@import` for IBM Plex Serif; it is removed since the PDF server now loads the font link.
- `cigar.css`, `milky_way.css`, `comet.css`, `index.css` Georgia/Garamond/Cambria entries are reviewed; any that are template body fonts get the variable, generic fallbacks stay.

### 3. Setting the variable

`TemplateComponent` and `CoverLetterTemplateComponent` receive the resolved font stack (or nothing) and set it as an inline style on their existing wrapper `div`: `style={{ '--doc-font': stack }}`. The variable is only set when the user has a valid saved choice for the active template; otherwise no style attribute is emitted, so default markup is byte-for-byte unchanged. Because the wrapper is part of the `renderToString` output that is already sent to the server, the PDF HTML carries the variable automatically.

### 4. Data

- `ResumeFormData` and the cover letter form data gain optional `fontFamily: { template: string; id: FontId }`.
- Recording the template means a font chosen for one template is ignored (default used) after the user switches to a different template, and restored if they switch back. This matches the section-ordering behaviour (`sectionLayout.template`).
- Held in Preview / CLPreview state and merged into the data on save and render (not a react-hook-form field), exactly like `sectionLayout`. "Reset to template default" removes the key from the saved JSON.
- Clone copies the JSON verbatim, so the font choice is cloned.

### 5. PDF servers

- The client adds `fontFamily` (the resolved font **id**, explicit or default) to the request payload for resume and cover letter PDF generation (`pdfPayload` / `pdfPayloadv2` in `client/src/utils/helper.ts`).
- Server, in `pdf.ts`, `pdfGenerator.ts` and `cl-pdf.ts`: validate the id against the server registry (unknown or missing falls back to the template default), then emit **one** `<link>` for that font's `googleHref`. The per-template link ladders in `pdf.ts` and `pdfGenerator.ts` and the fixed `FONT_CONFIGS` in `cl-pdf.ts` are deleted.
- `cl-pdf.ts` currently forces `body, * { font-family: … !important }`. That rule is dropped for cover letters; the template CSS variable now does the job, and it removes the risk of overriding icon fonts.
- The font id is validated server-side against a fixed allow-list, so it never reaches the HTML as free text.
- Existing wait logic (`networkidle0` plus `document.fonts.ready`) already waits for the font to load.

### 6. UI

- A new `FontPicker` component (lucide `Type` icon button with tooltip "Font", opening a popover) used in both `Preview.tsx` and `CLPreview.tsx` headers, placed next to the "Section order" button in the resume header.
- The popover lists the 17 fonts grouped Sans / Serif, each name rendered in its own typeface, with a check on the active one and a "Template default" badge on the template's default. A "Reset to template default" action sits at the bottom.
- Fonts are loaded for the picker by lazily injecting one combined Google Fonts stylesheet the first time the popover opens (the picker is the only client place that needs the fonts; the document preview is the server-rendered PDF).
- Each pick starts the existing debounce, then saves and regenerates the PDF through the existing path (`save-data`, `renderToString`, generate), reusing the `requestIdRef` stale-response guard.

## Error handling and edge cases

- Saved font id no longer in the registry (e.g. a font removed later) or saved for another template: treated as no choice, the template default renders.
- Font fails to load in Puppeteer (network): the CSS fallback stack in the variable value (`'Inter', sans-serif`) keeps the document readable.
- Rapid font changes coalesce into one regeneration via the debounce; older in-flight PDFs are dropped.
- Existing documents have no `fontFamily` and render with the template default (plus the intentional Hermes/Artemis/Ventus default changes).

## Testing

- Registry tests (both packages): every `TEMPLATE_DEFAULT_FONT` id exists; every font has a `googleHref` and `stack`; `resolveFontId` handles missing, wrong-template, and unknown-id inputs.
- Template render tests (Vitest, existing setup): with a saved choice the wrapper carries `--doc-font`; with none it emits no style attribute. The existing template snapshots are regenerated once; the diff must consist only of `font-family` declarations (plus the Hermes/Artemis fallback changes).
- A script-level check that no template CSS file still contains a raw `font-family:` without `var(--doc-font`, and no file references Ubuntu.
- Manual: for one template of each family (resume and cover letter), pick several fonts, confirm the PDF preview and the downloaded PDF match, icons still render, reset restores the default, clone keeps the choice. `tsc -b` and eslint pass on client and server.

## Out of scope

Separate heading and body fonts, font size or weight controls, user-uploaded fonts, color theming (next feature), loading Cinzel for Zeus default PDFs, reordering or restyling templates beyond font-family.
