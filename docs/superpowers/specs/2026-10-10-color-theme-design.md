# Resume Color Theme Customization - Design

Date: 2026-10-10
Branch: `text-and-color-theme-customization` (all work happens on this branch; no new branch or worktree)

## Goal

Let users recolor four resume templates from the Design panel and have the preview, the exported PDF and the saved data agree. Only the resume document is themed, never the web app itself. Cover letters and the other six resume templates are not part of this feature.

Builds on the font customization (same Design panel, same save/regenerate flow, same CSS-variable-with-fallback pattern).

## Confirmed requirements

- Templates in scope and their slots:

| Template | Slots | Where the color shows today |
|---|---|---|
| Andromeda | Primary ("Header") | indigo-to-cyan header gradient, section titles, tags, skill chips |
| Athena | Primary ("Sidebar") | dark blue sidebar plus blue accents in the main column |
| Zeus | Primary ("Header"), Secondary ("Accents") | navy header; gold borders, icons, dates, name |
| Artemis | Primary ("Header"), Secondary ("Sidebar") | dark slate header; purple sidebar plus the same purple as accents in the main column |
| Milky Way | Primary ("Header") only | purple-to-pink header gradient; purple titles, card borders and company names; pink dates, tags and accent bars |

- Each slot can be set four ways, **Primary** gets all four, **Secondary** gets the first three:
  1. **Curated palette** of 8 swatches.
  2. **Color picker** (the draggable color circle) plus a hex field.
  3. **Default**: the template's current colors. Selecting it clears that slot, so it is also the reset.
  4. **Gradient** (Primary only): two stops, each set through the same palette or color picker, plus a direction (horizontal, diagonal, vertical).
- Slots are independent: changing Primary leaves Secondary at its default, and vice versa.
- A document with no color choice renders exactly as it does today.
- When Primary is a gradient, accents that follow Primary (section titles, tags and so on) use the gradient's **first** stop.
- The color choice is saved with the document and applies only to the template it was picked for, like the font choice.
- Milky Way is a single-color theme (added after the first design): its pink accents follow the **end** of the header gradient and its purple parts follow the **start**, so a solid pick makes the whole template one color. The client derives the accent family (`--doc-secondary*`) from the primary's end stop; it has no secondary slot.
- Templates outside the five get no Color tab. Cover letters get no Color tab.

## Palette (8)

| Name | Hex |
|---|---|
| Navy | `#1e3a8a` |
| Blue | `#2563eb` |
| Teal | `#0f766e` |
| Green | `#15803d` |
| Purple | `#6d28d9` |
| Crimson | `#be123c` |
| Amber | `#b45309` |
| Slate | `#334155` |

All are dark enough to carry the templates' existing white text unchanged.

## Design

### 1. Readability rule (decision)

Light text on a colored background is not recolored. Instead, any color used as a **background under light text** (the header or sidebar fill, in any slot) is **automatically darkened until white text on it has a contrast ratio of at least 4.5:1**. The picker previews the adjusted result (the saved value is the exact pick; the same function adjusts it for both the preview and the PDF, so what the user sees is what exports). Zeus's Secondary (gold) is decorative on a light background and is never darkened; only fills under light text are: every Primary fill, and Artemis's sidebar (Secondary). A pale pick therefore becomes a darker shade of the same hue instead of producing unreadable text. Colors used for **text on a light background** (section titles, company names, dates) use an "ink" variant that is darkened until it reaches 4.5:1 against white. Purely decorative uses (borders, bars, bullets, underlines) use the exact picked color.

### 2. Data

`ResumeFormData` gains optional `colorTheme`:

```ts
type Direction = 'horizontal' | 'diagonal' | 'vertical';           // 90deg, 135deg, 180deg
type PrimaryFill =
  | { type: 'solid'; color: string }                               // '#rrggbb'
  | { type: 'gradient'; from: string; to: string; direction: Direction };
interface ColorTheme { template: 'andromeda' | 'athena' | 'zeus' | 'artemis'; primary?: PrimaryFill; secondary?: string }
```

Held in `Preview.tsx` state and merged into the data on save and render, exactly like `sectionLayout` and `fontFamily`. A theme whose `template` differs from the active template, or whose values are malformed, is treated as no choice. Reset (per slot via the Default swatch, or "Reset all colors") removes the slot or the whole key. No DB migration; clone copies the JSON verbatim.

### 3. Client color module

New pure module `client/src/utils/color-theme.ts`:

- Types above, `PALETTE` (8 entries), `COLOR_TEMPLATES` config (template to slot labels and default fills for the UI's Default swatch).
- Color math (sRGB/HSL): parse and normalize `#rrggbb`, `mix(a, b, t)`, relative luminance, WCAG contrast ratio, `clampForWhiteText(hex)` (lower HSL lightness in 2-point steps, floor 4, until contrast with `#ffffff` is at least 4.5), `inkOnWhite(hex)` (same loop targeting white as the background of text).
- `buildThemeVars(template, theme): Record<string, string>` returns only the variables for slots that have a valid choice for this template (empty object otherwise). Variables:
  - Primary (`P` = exact first stop, `B` = `clampForWhiteText(P)`):
    `--doc-primary-bg` (solid: `B`; gradient: `linear-gradient(<angle>deg, clamp(from), clamp(to))`), `--doc-primary` (`P`), `--doc-primary-ink` (`inkOnWhite(P)`), `--doc-primary-dark` (`B` with HSL lightness at most 38, floor 8), `--doc-primary-darker` (lightness at most 26, floor 6), `--doc-primary-light` (`mix(B, white, 0.75)` lifted toward white until it reaches 4.5:1 against every fill stop), `--doc-primary-lighter` (`mix(B, white, 0.88)`, same lifting, never darker than `--doc-primary-light`), `--doc-primary-link` (Artemis only: `#63b3ed` lightened to 4.5:1 against the header stops), `--doc-primary-tint` (`mix(P, white, 0.88)`), `--doc-primary-strip` (`linear-gradient(90deg, darker, dark, B, mix(B, white, .4), mix(B, white, .6))`), `--doc-primary-fade` (`linear-gradient(90deg, P, <P at 20% alpha as rgba>)`).
  - Secondary (`S` = picked color, `SB` = `clampForWhiteText(S)`):
    `--doc-secondary` (`S`), `--doc-secondary-ink` (`inkOnWhite(S)`), `--doc-secondary-dark` (`S` with lightness at most 40, floor 8), `--doc-secondary-light` (`mix(S, white, 0.35)`, for gold-on-dark text), `--doc-secondary-bg` (`linear-gradient(135deg, SB, <SB with lightness reduced 10 points>)`), `--doc-secondary-strip` (`linear-gradient(90deg, S, light, dark, light, S)`, Zeus's top border). `inkOnWhite` and `clampForWhiteText` are the same operation (darken until the contrast against white reaches 4.5:1), so `--doc-primary-ink` equals `B` and `--doc-secondary-ink` equals `SB`.
- `chooseColor`, `clearSlot` helpers that return the next `ColorTheme | undefined` (clearing the last slot returns `undefined`).

### 4. PDF payload and server

- `pdfPayload` in `client/src/utils/helper.ts` adds `themeVars: buildThemeVars(template, data.colorTheme)` to the request body. Because the whole document is already sent as `data`, the saved `colorTheme` rides along too.
- Server (`pdf.ts`) calls a new pure `buildThemeHead(vars: unknown): string` in `server/src/utils/theme-vars.ts`. It returns `<style>:root{...}</style>` or an empty string. It is a **strict sanitizer**, not a calculator: it accepts only an object, only variable names from a fixed allow-list (the 17 names above), and only values that match `^#[0-9a-f]{6}$`, or a strict `linear-gradient(<0-360>deg, <stops>)` pattern whose stops are only `#rrggbb` or `rgba(r, g, b, a)` tokens (with optional percentage positions), which covers every gradient variable including the fade. Anything else is dropped. This keeps arbitrary request data out of the HTML while keeping all color math in one place (the client).
- The color head is added next to the font head in the `<head>` of the resume PDF page. `printBackground` is already on, so gradients print.

### 5. Template CSS

For the four templates only, each theme-bearing color literal is replaced by `var(--doc-<role>, <current literal>)` so a document with no choice is unchanged. Neutral colors (body text, whites, greys, the Zeus brown text, translucent white overlays) are not touched. Translucent tints derived from a theme color use `color-mix(in srgb, var(--doc-<role>, <literal>) N%, transparent)`, which equals the old rgba in the default case. Role assignments (exact selectors and literals are listed in the plan):

- **Andromeda:** `.header` fill is `--doc-primary-bg`; section titles and technology-tag text use `--doc-primary-ink`; technology-tag background and the reference divider use `--doc-primary-tint`; the teal skill, language and interest chips use `--doc-primary-dark`.
- **Athena:** the sidebar's gradient layer is `--doc-primary-bg` (the existing translucent overlays stay on top); the top border strip is `--doc-primary-strip`; the light sidebar text shades use `--doc-primary-light` and `--doc-primary-lighter`; main-column titles use `--doc-primary-darker`, the title underline `--doc-primary-fade`, links and company names `--doc-primary-ink`, the summary's left border `--doc-primary`, tags and the green language tag `--doc-primary-dark`.
- **Zeus:** header fill is `--doc-primary-bg`; section titles and item headers use `--doc-primary-darker`, item titles `--doc-primary-ink`. The gold family follows Secondary: the top border strip `--doc-secondary-strip`, borders, icons and bullets `--doc-secondary`, date text `--doc-secondary-ink`, the item border `--doc-secondary-dark`, and the name, links and laurels on the header `--doc-secondary-light`.
- **Artemis:** header fill is `--doc-primary-bg`; the sidebar's gradient layer is `--doc-secondary-bg`; company names use `--doc-secondary-ink`, bullet markers and the summary border `--doc-secondary`, and the section-title underline `--doc-secondary-bg`. The social links on the header use `--doc-primary-link` (the default pale blue, lightened until it reads on the header); the faint decorative circles are unchanged.

### 6. UI

- The Design panel's tab bar becomes **Sections | Font | Color** for the four themeable templates, and stays **Sections | Font** for the other resume templates. Cover letters keep the tab-less Font view.
- **Color tab** content, top to bottom: a **Primary** section and, for Zeus and Artemis, a **Secondary** section. Each section has its slot label, a swatch grid (the 8 palette colors plus a **Default** swatch showing the template's own colors, and a **Custom** swatch that opens the picker), the active choice marked. Primary also has a **Solid / Gradient** switch; in Gradient mode it shows two stop buttons (selecting one makes it the active stop that the palette and picker edit), a direction control (three buttons), and a live preview bar. A **Reset all colors** action sits at the bottom when any slot is set.
- The color picker is `react-colorful`'s `HexColorPicker` with a hex input (new dependency, about 3 KB, no transitive dependencies).
- Each change goes through the existing `queueRegenerate` debounce and `requestIdRef` stale-response guard in `Preview.tsx`. Pending changes are flushed when leaving the page, as for fonts.

## Error handling and edge cases

- Invalid hex typed into the field is ignored until it is a valid `#rrggbb`.
- A saved theme for another template, or malformed, is treated as no choice.
- Rapid color drags coalesce into one regeneration (debounce); older PDFs are dropped.
- Switching template and back keeps the saved theme for the original template.

## Testing

- Client unit tests for the color module: parse/normalize, mix, contrast, `clampForWhiteText` always reaching 4.5:1 for a battery of colors including white, yellow and black, `inkOnWhite`, every variable produced for a solid primary, a gradient primary and a secondary, and "empty object for no choice or a wrong-template theme".
- Server unit tests for `buildThemeHead`: accepts the expected variables, drops unknown names and bad values, rejects non-object input, never emits anything that could break out of the `<style>` element.
- A guard test that the four stylesheets contain no leftover raw theme colors (the literals the plan lists) outside `var(--doc-…, …)` fallbacks.
- A lossless check like the font migration: undoing the `var()` wrappers reproduces the original CSS.
- A headless-browser check of computed colors for default and customized versions of each of the four templates, including a light pick that must be darkened.
- `tsc -b`, eslint and both test suites pass.

## Out of scope

Coloring the other six resume templates or cover letters; theming body text color; saved/custom user palettes; gradients on the secondary slot; more than two gradient stops; changing the web app's own light/dark theme.
