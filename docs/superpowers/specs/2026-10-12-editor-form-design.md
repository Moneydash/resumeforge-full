# Resume Editor Form Restyle (Scope C) - Design

Date: 2026-10-12
Branch: `preview-page-revamp` (continues the editor top bar work; spec: [2026-10-12-editor-top-bar-design.md](2026-10-12-editor-top-bar-design.md))

## Goal

Give the resume editor's form (the inputs, section headers, item cards, buttons and chips inside [ResumeForm.tsx](../../../client/src/components/ResumeForm.tsx)) the same warm-neutral look as the rest of the redesigned app, **without changing what any field does**. The user approved the proposed styling from the mockup, with **all-black primary buttons**.

## The proposed look (replaces the current look; it is not an addition)

| Element | Today | New |
|---|---|---|
| Inputs, selects, chip box | grey border, white or grey-700 fill, indigo focus glow | 40px tall (44px on touch screens), hairline warm border, 6px radius, ink border and a 2px blue ring with a white gap on keyboard focus |
| Labels | 14px grey-700 | 12.5px, muted warm grey, weight 500 |
| Item cards | grey-50 fill, grey border, shadow on hover | surface fill, hairline border, the border darkens on hover, no shadow |
| Section header | grey icon buttons, 20px title | neutral 34px icon buttons (44px on touch), 18px title, hairline underline |
| **Save** (each item card) | blue | **black** (near-white in dark mode) |
| **Save & Generate Resume** | indigo, full width | **black**, full width |
| Cancel, Add | grey fill, light indigo fill | white with a thin outline (ghost) |
| Remove | light red fill | ghost with red text |
| Skill chips and the skills badge | indigo and blue fills | surface with a hairline, ink text |
| Month and year pickers | stock select look | same look as the inputs |
| Error messages | red-500 (3.8:1 on white), no marker | `#b3261e` (6.5:1), with a small marker drawn in CSS so colour is not the only signal |
| Tooltips on social links | blue | ink |

Primary buttons are black in light mode and near-white with dark text in dark mode, exactly like "Get started", "New resume" and "Export PDF" elsewhere. The only blue left is the thin focus ring. Red remains only for errors and Remove.

## Scope

**In scope (class names only):**
- `client/src/styles/form-classes.ts` (the shared class strings: `inputClasses`, `labelClasses`, `sectionDivClasses`, `sectionHeaderClasses`, `buttonClasses`, `addButtonClasses`, `removeButtonClasses`, `cardClasses`).
- `client/src/components/ResumeForm.tsx` (the Save & Generate button classes only).
- The seven item sections with Save and Cancel buttons: `Awards`, `Certifications`, `Education`, `Experience`, `Projects`, `References`, `Skills`.
- The error message classes in `Awards`, `Certifications`, `Education`, `Experience`, `Personal`, `Projects`, `References`, `Skills`.
- `forms/ChipInput.tsx` (box, chips, remove buttons), the skills badge in `Skills.tsx`, the two tooltips in `Socials.tsx`, the icon buttons in `forms/SectionHeader.tsx`, and the two select triggers in `MonthPicker.tsx` (passing classes only).

**Out of scope:**
- Any behavior: react-hook-form, the yup schema, field arrays, drag and drop, collapse and hide, the live-edit subscription, validation messages and their wording.
- The shared shadcn components in `client/src/components/ui/` (`Input`, `Select`, `Textarea`, `Label`, `Button`): they are used by other pages and by the cover letter forms. Only the class strings passed into them change.
- The rich-text editor's internals (`EditorComponent`, Lexical, `styles/editor.css`, `editor-theme.css`).
- The Design panel, `/cl-preview`'s chrome and the hard-coded colours in the cover letter form files.

## Hard requirements

- **Colours are Tailwind utilities with the shared hex values, not CSS variables.** `/cl-preview` does not have the shared theme scope yet and the cover letter form reads the same class strings, so variables would silently fail there. Values: ink `#111110` / dark `#f4f4f2`, background `#ffffff` / `#0b0b0c`, surface `#f6f5f2` / `#151517`, muted text `#5c5b56` / `#a3a29c`, placeholder `#6f6e69` / `#8f8e88`, hairline `#e5e3dc` / `white/12`, strong hairline `#cfcdc5` / `white/25`, focus ring `#1f3f8f` / `#8fb0ff`, error `#b3261e` / `#ff8a80`. Each text and ring pair meets 4.5:1 (3:1 for the ring) in both themes; this is checked with a script.
- **Focus styles use the `focus-visible:` variant**, so they replace the shadcn defaults (`focus-visible:ring-[3px] focus-visible:ring-ring/50`) instead of stacking on them.
- **Touch targets:** inputs, select triggers, Save, Cancel, Remove, Add and the section header icon buttons are 44px high on coarse pointers (`pointer-coarse:min-h-11`) and compact with a mouse (inputs and selects 40px, buttons 36px).
- **The error marker is a `before:` pseudo-element in the class string** (no markup added), so the "only class names changed" guarantee holds.
- The cover letter form (`CLForm.tsx` and the cover letter field files) reads the same shared strings, so its inputs, labels, cards and buttons pick up the new look automatically. Its own hard-coded colours stay until that page is done.

## The behavior contract and its guard

Only `className` values and the exported class strings change. A temporary guard test strips every `className` value (string, template-literal or `{...}` expression, with balanced braces) from each touched file and fingerprints what is left, using hashes captured from the current commit. It fails if a single character outside a class value changes. For `form-classes.ts`, the guard asserts the list of exported names is unchanged. It is run after every slice, together with `tsc`, lint and a production build.

## Delivery: four slices, one commit each

1. **Shared strings:** `form-classes.ts` (inputs, labels, cards, section header, buttons). This restyles every field and card in one commit, and the cover letter form with it.
2. **Buttons:** Save and Cancel in the seven item sections, and the Save & Generate Resume button.
3. **Errors:** the error message classes in the eight files.
4. **The rest:** `ChipInput`, the skills badge, the social link tooltips, the section header icon buttons, and the month and year select triggers.

After every slice the user gets a short click-through checklist: type in every section; add, remove, reorder (drag) and edit items; Save and Cancel an item; trigger a validation error; collapse and hide sections; use the skills chips with Enter, comma and Backspace; pick months and years; submit with Save & Generate; dark mode; a narrow window; and a quick look at the cover letter editor's form.

## Verification limits

I cannot sign in or run the live generation, so the click-throughs are the user's. Automated checks prove only that nothing but class names changed, that contrast values pass, and that the build is healthy; they do not prove the visual result, which is why the slices are small.
