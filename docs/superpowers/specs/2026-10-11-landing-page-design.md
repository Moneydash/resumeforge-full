# Landing Page Redesign - Design

Date: 2026-10-11
Branch: `page-revamp` (all work happens on this branch; no new branch or worktree)

## Goal

Replace the current landing page ([client/src/pages/Home.tsx](../../../client/src/pages/Home.tsx)) with a modern, professional page that earns a visitor's trust at first sight and moves them to `/login`. The current page is generic AI-template styling: blue-violet gradients, a pill badge, three identical gradient-icon cards, a rotating "active card" ring, green checkmark rows and a gradient CTA block, with no product imagery.

This is the first page of the `page-revamp` effort. The visual language chosen here is meant to carry over to later pages, but only `/` is in scope now.

## Confirmed requirements

- **Tone:** professional and modern, not boring. Mostly monochrome with one restrained accent. No gradients, no pill badges, no colored icon tiles.
- **Direction:** "Product stage". A left-aligned sans headline beside a cropped editor window that bleeds off the right edge and shows the real section toggles next to a live resume. Chosen over "Editorial paper" and "Dark studio" in mockup review. Borrow the mono eyebrow labels and hairline rules from the editorial direction.
- **Centerpiece:** real product visuals, not exaggerated. Trust and legitimacy come from plainly stating what the product does.
- **Honesty rule (hard requirement):** no invented testimonials, logos, ratings, review scores or user counts. Every claim must match something the app actually does, and is checked against the code while writing copy. The sample resume in the hero is fictional and labeled "Sample resume".
- **Theme:** the page follows the existing app theme toggle (light and dark). It is currently hard-coded white.
- **CTAs:** all primary actions go to `/login`, as today.

## Page structure

1. **Nav**: sticky slim bar. Logo, Features, Templates, Privacy (`/privacy-policy`), existing `ThemeToggle`, Sign in, and a dark "Get started" button. Hairline bottom border, no blur-glass. Collapses to a simple menu on mobile. Includes a skip-to-content link.
2. **Hero**: mono eyebrow "Resume & cover letter builder"; headline "Build a resume you can stand behind."; one line of sub-copy; buttons "Start for free" and "Browse templates"; a single plain-text trust note (free, no credit card, PDF export). On the right, `EditorMock`.
3. **Trust strip**: three columns separated by hairlines: ATS-friendly layouts, full control (reorder, hide and rename sections, fonts, colors), private by default with PDF export.
4. **Feature rows**: alternating text and small real visual, replacing the three identical cards. Rows: editor controls, ATS scanner, cover letter builder.
5. **Template strip + closing CTA**: row of real template thumbnails at small size, then a plain dark closing band with one button.
6. **Footer**: static, rebuilt (Privacy, Terms, copyright).

### Verified product facts available for copy

- ATS scanner exists ([ATSScanner.tsx](../../../client/src/pages/ATSScanner.tsx)): uploads a PDF (max 5 MB), reads the text layer, checks sections and structure, returns a verdict and readability score. Copy must describe it as checking what an ATS can read from your PDF, not as a guarantee.
- 10 resume templates (andromeda, cigar, comet, milky_way, apollo, artemis, athena, hera, hermes, zeus) and 5 cover letter templates (aether, aqua, ignis, terra, ventus). Re-verify counts against `utils/templates-type.ts` and `utils/cl-templates-type.ts` when writing copy.
- Section reorder, visibility, collapse and custom headings; font and color customization (PRs #3 to #5 and earlier work). Re-verify against the code before stating specifics, since color customization covers only some templates.
- PDF export, light and dark theme toggle.

## Visual system

Tokens are defined once in `client/src/styles/landing.css`, scoped to a `.landing` wrapper, with a `.dark` override. The global shadcn theme in [index.css](../../../client/src/index.css) is not modified.

| Token | Light | Dark |
|---|---|---|
| Background | white | near-black |
| Surface (editor window, panels) | warm off-white | slightly raised |
| Ink (text, primary button) | near-black | near-white |
| Muted text | gray, at least 4.5:1 | gray, at least 4.5:1 |
| Hairline | warm light gray | low-opacity white |
| Accent | deep ink-blue; only on the resume's role line, focus rings, link underlines | lighter tint of the same blue |

- **Type:** Geist (already loaded in `index.html`; no new font request). Headlines weight 600, tracking about -0.035em. Scale 14, 16, 20, 32, 56. Mono eyebrow labels use the system mono stack.
- **Shape and depth:** 6px radius on buttons, 10px on the editor window, never pill-shaped. 1px hairline borders. One shadow, on the editor window only.
- **Motion:** one fade-up on hero load (about 300ms). In `EditorMock`, section toggles flip on a slow loop and the resume updates to match; this is the only animation. Hover states change color only, 150ms, no scale or lift. The current rotating active-card ring and card hover-lift are removed. All motion respects `prefers-reduced-motion`.
- **Accessibility:** 4.5:1 text contrast in both themes, visible focus rings, tap targets at least 44px, skip link, sequential heading levels, no horizontal scroll at 375px, icons from `lucide-react` only (no emoji).

## Implementation structure

New folder `client/src/components/landing/`, one file per block:

- `LandingNav`: nav, `ThemeToggle`, skip link, mobile menu.
- `Hero`: eyebrow, headline, sub-copy, buttons, trust note.
- `EditorMock`: cropped editor window.
- `TrustStrip`, `FeatureRows`, `TemplateStrip`, `ClosingCta`, `LandingFooter`.

`Home.tsx` becomes a thin composer that wraps the blocks in `.landing`. Blocks take no props. All copy lives as plain constants in `landing/content.ts` (one place to check every claim against the code), and the mock's section and frame data lives in `landing/mock-frames.ts`. Both are separate from the component files because the repo's `react-refresh/only-export-components` lint rule warns when a component file also exports arrays or objects.

**EditorMock:** pure presentational. The resume is built in HTML/CSS (template thumbnails are about 270px wide and blur at hero size). A static, correct first frame renders without JS. The toggle loop runs only while the mock is on screen (IntersectionObserver) and not at all under reduced motion.

**TemplateStrip:** uses `TEMPLATE_THUMBS` from `utils/template-thumbs.ts` (about 20 KB each) with explicit width and height and `loading="lazy"`. Links go to `/login` because `/templates` is behind sign-in.

**Footer:** [routes.tsx](../../../client/src/routes.tsx) hides the global fixed [Footer](../../../client/src/components/Footer.tsx) on `/` (one added condition). The landing page renders its own static `LandingFooter`. Other pages keep the old footer until they are redesigned.

## Out of scope

- Any page other than `/`.
- Changes to the global theme tokens, `Footer.tsx` itself, or routing beyond the footer condition.
- New fonts, new dependencies, backend changes.
- Analytics, cookie banners, pricing, testimonials or any social-proof content.

## Verification

- `tsc -b` and lint pass.
- Browser check at 375, 768 and 1440px in light and dark themes, with reduced motion on.
- Contrast and keyboard focus order check.
- Test files may be created for verification but must be deleted (with any snapshots) before committing and pushing.
