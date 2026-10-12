# ResumeForge Feature Roadmap

Ideas for expanding ResumeForge beyond the current feature set. None of these require AI or paid APIs.

## Current state

Resume and cover letter builders, 10 resume + 5 cover letter templates, PDF export, live preview, color/font/section customization, an ATS readability scanner, dashboards, Google/GitHub login, and dark mode.

## Tier 1: High impact, low cost

1. **Job description keyword matcher**
   Extend the ATS Scanner so the user pastes a job posting and gets matched and missing keywords. Plain text matching, no AI. Builds directly on the existing scanner.

2. **Import from PDF**
   Parse an existing PDF resume using the `pdfjs-dist` text extraction already in the project, and prefill the editor. Removes the biggest barrier for new users: retyping everything.
   *Note: JSON import is intentionally excluded, to avoid users hitting errors when pasting data that does not match our format.*

3. **Public share link**
   A unique read-only URL for each resume, with an on/off toggle. Optional view counter. Reuses the existing preview rendering.

4. **Export formats**
   Add DOCX and plain-text export. Recruiters often ask for Word, and plain text is useful for pasting into application forms.

5. **Rule-based writing checks**
   Flag weak verbs, missing numbers/metrics, passive voice, overly long bullets, and a missing summary. Static rules, not AI. Pairs well with the ATS score.

## Tier 2: Retention

6. **Job application tracker**
   Kanban board (Saved, Applied, Interview, Offer, Rejected). Each card links to the resume and cover letter used. Gives users a reason to return.

7. **Tailored copies per job**
   Clone a resume with a "target job" label and a link back to its base resume. Cloning already exists, so this is mostly metadata and UI.

8. **Version history and undo**
   Autosave snapshots with restore. Needed because live autosave makes accidental overwrites a real risk.

9. **Custom sections**
   Let users add their own sections (Volunteering, Publications, Awards) using the existing section reordering.

## Tier 3: Growth and polish

10. **More auth options**
    Email/password or magic link, for users who do not want Google or GitHub.

11. **Account and privacy tools**
    Delete account and download my data. Supports the existing legal pages.

12. **More templates**
    One-page compact option, photo/no-photo variants, non-English fonts and date formats.

13. **Onboarding**
    "Start from sample" button (using `sample-resume.ts`) and a first-run checklist.

14. **Accessibility and mobile**
    Keyboard and screen-reader pass, plus a mobile-friendly preview.

## Later: revenue options

Premium templates, unlimited ATS scans (current limit is 10 per 30 minutes), or a custom domain on share links. Build these only after Tier 1 shows users are sticking around.

## Recommended starting order

1. Job description keyword matcher
2. Import from PDF
3. Public share link

These reuse existing infrastructure, cost nothing to run, and give users a clear reason to choose ResumeForge over other free builders.
