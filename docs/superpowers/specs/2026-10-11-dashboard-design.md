# Dashboard Redesign - Design

Date: 2026-10-11
Branch: `page-revamp` (all work happens on this branch; no new branch or worktree)

## Goal

Redesign `/dashboard` ([client/src/pages/Dashboard.tsx](../../../client/src/pages/Dashboard.tsx)) in the same language as the redesigned landing page: monochrome warm neutrals, one quiet ink-blue accent, no gradients or gimmicks. The page is a working tool, so it should be calm and dense and make "open or create a resume" fast.

The current page is AI-template styling: slate-to-blue gradient background, gradient icon tiles and empty state, three differently colored action buttons (white, green, yellow), images that zoom on hover, and clone/rename/delete icons that are `opacity-0` until hover (unreachable by keyboard and touch, labeled only by `title`). It is a 663-line component with the resume card markup duplicated for resumes without a snapshot, and it loads full-size snapshots where 20 KB thumbnails exist.

Second page of the `page-revamp` effort (landing page: [2026-10-11-landing-page-design.md](2026-10-11-landing-page-design.md)). Only `/dashboard` is in scope.

## Confirmed requirements

- **Layout:** left sidebar (the user picked this over top-bar tabs and over keeping secondary buttons). Destinations: **Resumes** (active here), **Cover letters** (`/cl-dashboard`), **ATS scanner** (`/ats-scanner`). Theme toggle and **Log out** at the bottom. One primary **New resume** button in the page header.
- **Views:** both grid ("Gallery") and list ("Ledger") are kept behind a labeled toggle. **Gallery is the default.** The choice is not persisted (not today's behavior either; not added).
- **Fake delay removed, loading feedback added:** Edit and the sidebar destinations navigate immediately. The clicked control shows a spinner and "Opening...", sets `aria-busy`, and ignores further clicks. A loading toast with a known id is also shown and dismissed when the dashboard unmounts (the moment the new page appears). Reason: `/preview` and `/templates` do not dismiss toasts on arrival, so a plain toast would linger; on a slow connection the user must still see that something is happening.
- **Other pages:** `/cl-dashboard`, `/ats-scanner` and every other page keep their current chrome (including the floating logout button) until they are redesigned. The resulting inconsistency when moving between them is accepted for now.
- **Behavior kept exactly:** fetching resumes, create, rename, delete (with confirmation), clone, and Edit routing (to `/templates?resumeId=<id>` when the resume has no template, else `/preview?template=<t>&resumeId=<id>`, including the `localStorage` writes it does today). Dialog wording is unchanged.
- **Honesty and tone:** no invented numbers, no filler copy. Copy only states what the page does.

## Page structure

1. **AppShell**: sidebar (240px, sticky, full height) from `lg` up with logo, three nav items, and a bottom group (theme toggle, Log out). Below `lg` it becomes a slim top bar (logo, menu button) whose drawer holds the same items. Skip-to-content link, one `<main id="main">`. Active item has `aria-current="page"`.
2. **Header**: h1 "Resumes", count ("1 resume" / "N resumes"), labeled grid/list toggle (`aria-pressed`, `aria-label`), primary **New resume**.
3. **Gallery view**: grid of cards, then a dashed "New resume" tile. Card: template thumbnail (cropped from the top, surface background), name (or "Untitled"), "Template - edited date", always-visible **Edit** button, and a **more menu** (Clone, Rename, Delete; Delete in the danger color after a separator). A resume with no template shows a plain "No template yet" placeholder and Edit leads to the templates page as today.
4. **List view**: table with thumbnail, name and file slug, template, last edited, Edit and the more menu. Rows stack on phones.
5. **States**: skeleton cards (or rows) while the initial load runs; plain centered empty state ("No resumes yet", one line, New resume button); error state (short message and **Retry**) if the initial load fails.
6. **Dialogs**: create/rename and delete keep the existing shadcn `Dialog` and logic; they only pick up the new look (ink buttons instead of the default blue).

## Visual system

Reuses the landing page tokens. A second scope `.app-shell` is added next to `.landing` in [client/src/styles/landing.css](../../../client/src/styles/landing.css) (light and dark values identical); the landing page itself does not change. The global shadcn theme in [index.css](../../../client/src/index.css) is not modified.

- **Type:** Geist (already loaded). Page title 28px weight 600, tight tracking. Card name 15px semibold, meta 13px muted, table headers use the mono uppercase label.
- **Shape and depth:** cards 1px hairline, 8px radius, no shadow. Hover only darkens the border (150ms); no scale, no lift, no image zoom.
- **Controls:** 44px-tall ink primary and ghost buttons (landing classes). The more-menu button has an `aria-label` and a 44px hit area. The menu uses the repo's existing Radix `DropdownMenu`, restyled to the tokens.
- **Motion:** color transitions only; skeleton pulse is disabled under `prefers-reduced-motion`.
- **Accessibility:** 4.5:1 text contrast in both themes (the landing token pairs already pass), visible focus rings, `aria-pressed` on the view toggle, `aria-current="page"` on the active nav item, skip link, a single h1, icons from `lucide-react` only, no emoji.

## Implementation structure

`Dashboard.tsx` stays the container (store use, fetching, create/rename/delete/clone/edit handlers, unchanged except where noted) and renders a presentational `DashboardView` that takes plain props (resumes, status, view mode, handlers). This also makes the page testable and viewable without signing in.

New files:

- `client/src/components/app-shell/AppShell.tsx` and `nav-items.ts`: sidebar, mobile top bar and drawer, skip link, `<main>`.
- `client/src/components/LogoutDialog.tsx`: the confirm dialog extracted from [LogoutButton.tsx](../../../client/src/components/LogoutButton.tsx). The floating `LogoutButton` keeps its look and behavior; the sidebar's Log out item opens the same dialog.
- `client/src/hooks/usePendingNavigation.ts`: `go(key, to, message)` navigates immediately and exposes `pendingKey`; shows a loading toast with an id and dismisses it on unmount. Used by the sidebar and the Edit buttons.
- `client/src/components/dashboard/`: `DashboardView`, `DashboardHeader`, `ResumeCard`, `ResumeTable`, `ResumeActionsMenu`, `ResumeFormDialog`, `DeleteResumeDialog`, `DashboardStates` (skeleton, empty, error).
- `client/src/styles/dashboard.css`: only the sidebar, card and table classes; everything else reuses landing tokens and helpers.

**Data flow:** the zustand stores are unchanged. A local `status` of `loading | ready | error` is set by the **initial** fetch only, so a failed refresh after a delete, clone or rename never replaces the list with the error screen. Thumbnails come from `TEMPLATE_THUMBS` (`utils/template-thumbs.ts`), not the large snapshots. Names, template labels and dates keep using `formatTemplateName` and `formatDateDisplay`.

## Out of scope

- Any page other than `/dashboard`, including `/cl-dashboard` and `/ats-scanner` (they keep their current chrome).
- Persisting the view mode, search, sorting, filtering, bulk actions, or any other new feature.
- Changes to the API, the stores, routing, or the Edit/create/rename/delete/clone logic beyond the loading feedback and the initial-load status above.
- New dependencies or fonts.

## Verification

- `tsc -b`, lint and a production build pass.
- I cannot sign in to the real app, so the page is checked in the browser through a temporary harness that renders `DashboardView` (with `AppShell`) from fake data, in both themes at 375, 768 and 1440px, plus a keyboard pass (skip link, nav, toggle, more menu, dialogs) and reduced motion where the tool allows it.
- Temporary unit tests (cards, table, states, nav `aria-current`, logout dialog) use `react-dom/server` in the `node` test environment; the pending-navigation rules (one pending key at a time, repeat clicks ignored) live in a small pure helper next to the hook so they can be unit-tested without a DOM.
- The real fetch, create, Edit, delete and logout flows against the live API are verified by the user clicking through once after the work is done.
- The harness and all test files (and snapshots) are deleted before committing and pushing; commits stage explicit paths only.
