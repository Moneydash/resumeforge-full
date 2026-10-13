# Modals and Pop-ups Revamp - Design

Date: 2026-10-13
Branch: `page-revamp` (re-opened; no new branch is created)

## Goal

Give the app's three dialogs, the "more actions" menu, the select panels and the toasts the same warm-neutral look as the pages already redesigned, with a bottom sheet for dialogs on phones. **Wording, behavior and data flow do not change.** The user chose "Option B" from the mockup (editorial card on desktop, bottom sheet on phones).

## The look

| Element | Today | New |
|---|---|---|
| Dialog panel | `bg-background`, generic shadcn tokens, 8px radius, X close | white (`#0b0b0c` dark), hairline border, 14px radius, soft shadow, 24px padding |
| Eyebrow (new) | none | small mono uppercase label above the title: muted, red for destructive dialogs |
| Title / description | 18px / muted-foreground | 20px, weight 600, tight tracking / 14px, `#5c5b56` (`#a3a29c` dark) |
| Scrim | `bg-black/50` | unchanged strength (50%), no blur |
| Primary button | default shadcn button | ink `#111110` (`#f4f4f2` dark), 40px high |
| Cancel button | outline or default | ghost with a strong hairline |
| Destructive button | shadcn destructive | red `#b3261e` with white text (`#ff8a80` with dark text in dark mode) |
| Close | X in the corner | "ESC" chip button for a mouse, 44px X button on touch screens |
| Phone (under 640px) | same centered box | bottom sheet: slides up, 18px top corners, grab handle, full-width stacked buttons (action first, Cancel second), safe-area padding |
| Actions menu | generic popover | 12px radius, hairline, 36px rows, "ACTIONS" eyebrow, red Delete row |
| Select panel | generic popover | same panel as the menu, check on the selected row |
| Tooltip | already ink | unchanged |
| Toasts | stock light toast | ink (near-white in dark mode) for status, red for errors |

Red stays only on destructive actions and errors. Primary is always ink. The only blue is the thin focus ring.

## Differences from the mockup (deliberate)

- **Real wording is kept**: "Delete Resume?", "Create New Resume", "Resume name", "Resume slug", "Create Resume" and the cover letter equivalents come from `DocLabels` and the existing components. The mockup shortened them.
- **The eyebrow is new copy**: "Account" (Log out), "Permanent action" (Delete) and `New <resume|cover letter>` or "Edit details" (Create or rename). It is decoration; the title still carries the meaning.
- **A touch-screen user keeps a close button** (44px X) in addition to Cancel and tapping the scrim. The mockup's phone frame showed none.
- **No swipe-down-to-dismiss** in this pass (it needs gesture handling; out of scope).

## Scope

**In scope (class names, plus the small markup noted):**
- `ui/dialog.tsx`: overlay, content (responsive sheet), header, footer, title, description, close button, and a new `DialogEyebrow` export plus a decorative grab handle.
- `components/LogoutDialog.tsx`, `dashboard/DeleteResumeDialog.tsx`, `dashboard/ResumeFormDialog.tsx`: add the eyebrow and use shared button class strings; the form dialog's two fields use the form input classes.
- `ui/dropdown-menu.tsx`, `dashboard/ResumeActionsMenu.tsx` (the "ACTIONS" eyebrow row), `ui/select.tsx` (content and item classes only).
- `App.tsx`: pass `toastOptions` to the existing sonner `Toaster`.
- New `styles/popup-classes.ts` with the shared button strings.
- Delete `components/LogoutButton.tsx`, which nothing imports.

**Out of scope:**
- Dialog open/close state, `onOpenChange` rules (e.g. Logout cannot close while logging out), logout and delete requests, validation, slug handling, toast calls and texts.
- The Radix primitives' behavior (focus trap, Escape, scroll lock, portals).
- Swipe-to-dismiss; the select trigger and tooltip (already restyled); toast positions and durations.

## Hard requirements

- **Colours are Tailwind hex utilities, not CSS variables.** Dialogs, menus, selects and toasts render in portals outside `.app-shell`, so the shared `--l-*` tokens do not reach them. Values: ink `#111110` / dark `#f4f4f2`; background `#ffffff` / `#0b0b0c`; surface `#f6f5f2` / `#151517`; muted `#5c5b56` / `#a3a29c`; hairline `#e5e3dc` / `white/12`; strong hairline `#cfcdc5` / `white/25`; focus ring `#1f3f8f` / `#8fb0ff`; red `#b3261e` / `#ff8a80`. Contrast of every text pair is checked by a script (4.5:1; ring 3:1).
- **Sheet breakpoint is 640px** (`sm:`). Below it the panel is pinned to the bottom with `max-h-[90dvh]`, scrolls inside, and pads for `env(safe-area-inset-bottom)`.
- **Focus styles use `focus-visible:`**; buttons are 40px on desktop and 46px in the sheet; touch targets are at least 44px.
- **Motion** is 150-250ms ease-out, slide-up for the sheet and fade-scale for the card, and stops under `prefers-reduced-motion`.
- The destructive button keeps its position as the last (desktop) and first (sheet) action, via the existing `flex-col-reverse` footer.
- Keyboard: Escape closes, Tab stays inside the dialog, focus returns to the trigger (all Radix behavior, unchanged). The Logout dialog still ignores close requests while logging out.

## The behavior contract and its guard

A temporary guard test fingerprints each touched component file after stripping `className` values and `*Classes` constants, using hashes captured from the current commit. For the three dialog components and `ResumeActionsMenu`, the only allowed non-class differences are the eyebrow element, the shared-class imports and the removed button `variant` props; the guard is re-baselined for those once, after a diff review. `ui/dialog.tsx` is guarded by its exported-name list plus its unchanged `open` / `onOpenChange` wiring. Per-slice assertions check that the old shadcn colour tokens (`bg-background`, `bg-popover`, `bg-accent`, `text-muted-foreground`, `destructive`) are gone from the touched files. The guard runs after every slice, together with `tsc`, lint and a production build.

## Delivery: four slices, one commit each

1. **Dialog primitive**: `ui/dialog.tsx` (overlay, responsive card-or-sheet content, header, footer, title, description, close, `DialogEyebrow`, grab handle) and `styles/popup-classes.ts`. All three dialogs change shape at once.
2. **The three dialogs**: eyebrows, buttons from `popup-classes`, and the form dialog's fields; delete `LogoutButton.tsx`.
3. **Menu and select panels**: `dropdown-menu.tsx`, `select.tsx` and the "ACTIONS" row.
4. **Toasts**: `toastOptions` in `App.tsx`.

After each slice the user gets a short click-through checklist: open and cancel each dialog; Escape and scrim click; confirm delete; log out including the "Logging out..." state; create and rename with the keyboard (Tab order, Enter to submit); the actions menu and a month/year select; trigger a success, an error and a loading toast; dark mode; a phone-width window and a real phone if possible.

## Verification limits

I cannot sign in or run real deletions, logouts or clones, so those click-throughs are the user's. Automated checks prove only that nothing but class names (and the noted additions) changed, that contrast passes, and that the build is healthy; the visual result and the sheet's feel on a real phone are for the user to confirm.
