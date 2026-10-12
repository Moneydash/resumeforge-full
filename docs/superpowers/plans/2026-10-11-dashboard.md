# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/dashboard` as a sidebar page (Gallery default, List toggle) in the landing page's monochrome language, with immediate navigation plus loading feedback instead of the fake 1.5 s delay.

**Architecture:** `Dashboard.tsx` stays the container (store, fetching, handlers) and renders a new presentational `DashboardView` inside a reusable `AppShell` (sidebar, mobile top bar). Tokens come from the landing page by adding an `.app-shell` scope next to `.landing`; a small `dashboard.css` holds only the new classes. A pure helper plus a hook (`usePendingNavigation`) provide the loading feedback. The logout confirm dialog is extracted so the sidebar and the existing floating button share it.

**Tech Stack:** React 19, Vite 6, Tailwind 4 (layout utilities only), `lucide-react`, `react-router-dom` 7, Radix `DropdownMenu` and shadcn `Dialog` (already in the repo), `sonner`, Vitest 5 in the `node` environment (tests use `react-dom/server`).

**Spec:** [docs/superpowers/specs/2026-10-11-dashboard-design.md](../specs/2026-10-11-dashboard-design.md)

All paths are relative to the repo root. Run client commands from `client/`.

## Global Constraints

- Only `/dashboard` changes. `/cl-dashboard`, `/ats-scanner` and every other page keep their current chrome, including the floating `LogoutButton` (look and behavior unchanged).
- Behavior kept exactly: fetching resumes, create, rename, delete with confirmation, clone, and Edit routing (to `/templates?resumeId=<id>` when the resume has no template, else `/preview?template=<t>&resumeId=<id>`, including today's `localStorage` writes). Dialog wording unchanged. The zustand stores and the API are not touched.
- Monochrome warm neutrals plus one quiet ink-blue accent. No gradients, no colored icon tiles, no hover zoom or lift, no hover-only actions, no emoji; icons from `lucide-react` only.
- Gallery is the default view; the view mode is not persisted; no new features (search, sort, filter, bulk actions).
- Tokens reuse the landing variables (`--l-*`) via a second scope `.app-shell` in `client/src/styles/landing.css`; the landing page and the global shadcn theme in `client/src/index.css` must not change. Portaled content (dropdown menu, dialogs) renders outside `.app-shell`, so it uses the global shadcn tokens and Tailwind utilities, never `--l-*` variables.
- Accessibility: 4.5:1 contrast (same token pairs already verified), visible focus rings, 44px tap targets, `aria-pressed` on the view toggle, `aria-current="page"` on the active nav item, `aria-label` on icon-only buttons, skip link, a single h1 (cards use h2), skeleton pulse disabled under `prefers-reduced-motion`.
- Loading feedback: Edit and sidebar destinations navigate immediately; the clicked control shows a spinner and "Opening...", sets `aria-busy`, repeat clicks are ignored; a loading toast with a known id is dismissed when the dashboard unmounts; a 15 s safety timeout clears a stuck pending state.
- The initial fetch alone drives `status` (`loading | ready | error`); a failed refresh after create/rename/delete/clone must never replace the list with the error state.
- The global fixed `Footer` is hidden on `/dashboard` (it would overlap the sidebar) with one added condition in `client/src/routes.tsx`.
- Do not push. Commits stay local on `page-revamp` unless the user asks.
- Test files, the browser harness and any snapshots may be created for verification but must never be staged or committed. Every commit step stages explicit paths only; Task 7 deletes them all and checks `git status`.
- Commit messages end with the line: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## Review Focus

1. **Dropdown menu opening a dialog (Radix focus and `pointer-events` lock):** choosing Delete or Rename from the more menu must open the dialog, and closing it must leave the page clickable. Mitigation is `modal={false}` on the menu; pinned by the browser steps in Task 7.
2. **Unknown or missing template id** (`''`, or an id with no thumbnail): the card and row must show the "No template yet" placeholder, never a broken image or a crash. Pinned by tests in Task 4.
3. **Very long resume names and slugs:** must wrap inside cards and rows without horizontal page scroll at 375px. Pinned by the long-name fixture and `scrollWidth` check in Task 7.
4. **Stuck "Opening..." state** (route chunk fails to load, or a second click while pending): one pending key at a time, repeat clicks ignored, and a 15 s timeout clears it. Pinned by the `beginPending` tests in Task 1.
5. **Flash of "No resumes yet" before data arrives, and error state after a failed refresh:** `loading` must render the skeleton (never the empty state); `error` only follows the initial load. Pinned by the status tests in Task 5 and the `setStatus` grep check in Task 6.

---

### Task 1: Pending-navigation helper and hook

**Files:**
- Create: `client/src/hooks/pending-navigation.ts`
- Create: `client/src/hooks/usePendingNavigation.ts`
- Test (temporary, never committed): `client/src/hooks/pending-navigation.test.ts`

**Interfaces:**
- Produces (`pending-navigation.ts`): `beginPending(current: string | null, key: string): { started: boolean; next: string | null }`.
- Produces (`usePendingNavigation.ts`): `usePendingNavigation(): { pendingKey: string | null; go: (key: string, to: string, message: string, beforeNavigate?: () => void) => void }`; `PENDING_TIMEOUT_MS = 15000`.

- [ ] **Step 1: Write the failing test**

Create `client/src/hooks/pending-navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { beginPending } from './pending-navigation';

describe('beginPending', () => {
  it('starts when nothing is pending', () => {
    expect(beginPending(null, 'edit:1')).toEqual({ started: true, next: 'edit:1' });
  });

  it('ignores a second click on a different key while one is pending', () => {
    expect(beginPending('edit:1', 'nav:ats')).toEqual({ started: false, next: 'edit:1' });
  });

  it('ignores a repeat click on the same key', () => {
    expect(beginPending('edit:1', 'edit:1')).toEqual({ started: false, next: 'edit:1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/hooks/pending-navigation.test.ts`
Expected: FAIL, "Failed to resolve import './pending-navigation'" (or "Cannot find module").

- [ ] **Step 3: Create `client/src/hooks/pending-navigation.ts`**

```ts
/** Only one navigation may be pending at a time; clicks while one is pending are ignored. */
export function beginPending(current: string | null, key: string): { started: boolean; next: string | null } {
  return current === null ? { started: true, next: key } : { started: false, next: current };
}
```

- [ ] **Step 4: Create `client/src/hooks/usePendingNavigation.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { beginPending } from './pending-navigation';

const TOAST_ID = 'pending-navigation';
export const PENDING_TIMEOUT_MS = 15000;

/**
 * Navigates immediately, but tells the user it is happening: `pendingKey` names the control
 * that was clicked and a loading toast is shown. The toast is dismissed when the calling page
 * unmounts (the new page has appeared). A timeout clears the state if the route never arrives.
 */
export function usePendingNavigation() {
  const navigate = useNavigate();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      toast.dismiss(TOAST_ID);
    },
    [],
  );

  const go = useCallback(
    (key: string, to: string, message: string, beforeNavigate?: () => void) => {
      const { started, next } = beginPending(pendingRef.current, key);
      if (!started) return;
      pendingRef.current = next;
      setPendingKey(next);
      toast.loading(message, { id: TOAST_ID });
      beforeNavigate?.();
      timerRef.current = setTimeout(() => {
        pendingRef.current = null;
        setPendingKey(null);
        toast.dismiss(TOAST_ID);
      }, PENDING_TIMEOUT_MS);
      navigate(to);
    },
    [navigate],
  );

  return { pendingKey, go };
}
```

- [ ] **Step 5: Run test and type-check**

Run (from `client/`): `npx vitest run src/hooks && npx tsc -b`
Expected: 3 tests PASS; tsc exit 0.

- [ ] **Step 6: Commit (explicit paths; the test file is never staged)**

```bash
git add client/src/hooks/pending-navigation.ts client/src/hooks/usePendingNavigation.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): add pending-navigation helper and hook

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extract LogoutDialog

**Files:**
- Create: `client/src/components/LogoutDialog.tsx`
- Modify (full replace): `client/src/components/LogoutButton.tsx`
- Test (temporary, never committed): `client/src/components/logout.test.tsx`

**Interfaces:**
- Produces: default export `LogoutDialog` with props `{ open: boolean; onOpenChange: (open: boolean) => void }`. It owns the `loggingOut` state and the logout request; its markup and wording are exactly today's dialog.
- `LogoutButton` keeps its default export, no props, and its current floating look and behavior.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/logout.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LogoutDialog from './LogoutDialog';
import LogoutButton from './LogoutButton';

describe('LogoutDialog', () => {
  it('renders nothing while closed', () => {
    expect(renderToStaticMarkup(<LogoutDialog open={false} onOpenChange={() => {}} />)).toBe('');
  });
});

describe('LogoutButton', () => {
  const html = renderToStaticMarkup(<LogoutButton />);

  it('keeps its floating look and accessible name', () => {
    expect(html).toContain('aria-label="Log out"');
    expect(html).toContain('fixed bottom-6 left-6');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/logout.test.tsx`
Expected: FAIL, "Failed to resolve import './LogoutDialog'".

- [ ] **Step 3: Create `client/src/components/LogoutDialog.tsx`**

```tsx
import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Confirmation dialog that ends the session; shared by the floating LogoutButton and the sidebar
const LogoutDialog: React.FC<LogoutDialogProps> = ({ open, onOpenChange }) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const clearClientSession = () => {
    // Only cookies readable from JS can be removed here; HttpOnly ones (session, CSRF) are cleared by the server
    Object.keys(Cookies.get()).forEach((name) => Cookies.remove(name));
    localStorage.clear();
    sessionStorage.clear();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await getCsrfToken();
      await client.post('/logout');
    } catch (error: unknown) {
      // 401/403 means the server session is already gone, so there is nothing left to end
      const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
      if (status !== 401 && status !== 403) {
        console.error('Failed to logout: ', error);
        toast.error('Logout failed. Please try again.');
        setLoggingOut(false);
        return;
      }
    }
    clearClientSession();
    // Full page load so in-memory app state (stores) from this session is dropped too
    window.location.assign('/login');
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!loggingOut) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log out?</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to log out? You will need to sign in again to access your resumes.
        </DialogDescription>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            disabled={loggingOut}
            className="dark:text-white"
          >
            Stay signed in
          </Button>
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="destructive"
            className="flex items-center gap-2"
          >
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {loggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutDialog;
```

- [ ] **Step 4: Replace `client/src/components/LogoutButton.tsx` entirely**

```tsx
import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import LogoutDialog from '@/components/LogoutDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Floating logout button (bottom-left) that asks for confirmation before ending the session
const LogoutButton: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <LogoutDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setDialogOpen(true)}
            aria-label="Log out"
            className="fixed bottom-6 left-6 z-40 w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white shadow-lg hover:shadow-xl hover:text-red-600 dark:hover:text-red-400 hover:scale-105 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Log out</TooltipContent>
      </Tooltip>
    </>
  );
};

export default LogoutButton;
```

- [ ] **Step 5: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/logout.test.tsx && npx tsc -b && npx eslint src/components/LogoutDialog.tsx src/components/LogoutButton.tsx`
Expected: 2 tests PASS; tsc exit 0; eslint prints nothing (the `any` error that existed in the old `LogoutButton.tsx` is gone).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/LogoutDialog.tsx client/src/components/LogoutButton.tsx
git commit -m "$(cat <<'EOF'
refactor: extract LogoutDialog from LogoutButton

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Styles and AppShell

**Files:**
- Modify: `client/src/styles/landing.css` (selector lists only)
- Create: `client/src/styles/dashboard.css`
- Create: `client/src/components/app-shell/nav-items.ts`
- Create: `client/src/components/app-shell/AppShell.tsx`
- Test (temporary, never committed): `client/src/components/app-shell/app-shell.test.tsx`

**Interfaces:**
- Consumes: `usePendingNavigation` (Task 1), `LogoutDialog` (Task 2), existing `ThemeToggle` (optional `styleClass`; always pass one), `l-*` helper classes from `landing.css`.
- Produces (`nav-items.ts`): `interface NavItem { key: 'resumes' | 'letters' | 'ats'; label: string; to: string; icon: LucideIcon; pendingMessage: string }`, `NAV_ITEMS: readonly NavItem[]`, `isActive(pathname: string, to: string): boolean`.
- Produces: default export `AppShell({ children: ReactNode })`.
- Produces (`dashboard.css`): `.app-sidebar`, `.app-topbar`, `.app-topbar-panel`, `.app-nav-item`, `.app-utility`, `.app-title`, `.app-card`, `.app-thumb`, `.app-thumb--empty`, `.app-iconbtn`, `.app-seg`, `.app-newtile`, `.app-table`, `.app-skeleton`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/app-shell/app-shell.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/ThemeToggle', () => ({ default: () => null }));

import AppShell from './AppShell';
import { NAV_ITEMS, isActive } from './nav-items';

const render = (path: string) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <p>page body</p>
      </AppShell>
    </MemoryRouter>,
  );

describe('isActive', () => {
  it('matches the exact route and its children only', () => {
    expect(isActive('/dashboard', '/dashboard')).toBe(true);
    expect(isActive('/dashboard/x', '/dashboard')).toBe(true);
    expect(isActive('/cl-dashboard', '/dashboard')).toBe(false);
  });
});

describe('AppShell', () => {
  const html = render('/dashboard');
  const links = html.match(/<a [^>]*>/g) ?? [];

  it('lists the three destinations', () => {
    for (const item of NAV_ITEMS) expect(html).toContain(item.label);
    expect(NAV_ITEMS.map((i) => i.to)).toEqual(['/dashboard', '/cl-dashboard', '/ats-scanner']);
  });

  it('marks only the current destination with aria-current', () => {
    const current = links.filter((tag) => tag.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/dashboard"');
  });

  it('marks Cover letters current on /cl-dashboard', () => {
    const current = (render('/cl-dashboard').match(/<a [^>]*>/g) ?? []).filter((tag) => tag.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/cl-dashboard"');
  });

  it('has a skip link, one main landmark, the page body and a log out control', () => {
    expect(html).toContain('href="#main"');
    expect(html.split('<main').length - 1).toBe(1);
    expect(html).toContain('page body');
    expect(html).toContain('Log out');
  });

  it('starts with the mobile menu closed', () => {
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('id="app-mobile-menu"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/app-shell/app-shell.test.tsx`
Expected: FAIL, "Failed to resolve import './AppShell'".

- [ ] **Step 3: Extend the token scope in `client/src/styles/landing.css`**

Make exactly these five replacements (nothing else in the file changes):

1. Change the line `.landing {` (the first rule, which declares the `--l-*` variables) to:
   `.landing,` newline `.app-shell {`
2. Change `.dark .landing {` to:
   `.dark .landing,` newline `.dark .app-shell {`
3. Change `.landing main:focus { outline: none; }` to:
   `.landing main:focus, .app-shell main:focus { outline: none; }`
4. Change `.landing :focus-visible { outline: 2px solid var(--l-accent); outline-offset: 2px; }` to:
   `.landing :focus-visible, .app-shell :focus-visible { outline: 2px solid var(--l-accent); outline-offset: 2px; }`
5. Change the reduced-motion selector line `.landing *, .landing *::before, .landing *::after {` to:
   `.landing *, .landing *::before, .landing *::after,` newline `.app-shell *, .app-shell *::before, .app-shell *::after {`

Leave `.landing section[id]` and `html:has(.landing)` untouched (landing only).

- [ ] **Step 4: Create `client/src/styles/dashboard.css`**

```css
/* Dashboard and app-shell classes. Variables come from the .app-shell scope in landing.css. */

.app-sidebar { background: var(--l-surface); border-right: 1px solid var(--l-hair); }
.app-topbar { background: var(--l-bg); border-bottom: 1px solid var(--l-hair); }
.app-topbar-panel { background: var(--l-bg); border-top: 1px solid var(--l-hair); }

.app-nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--l-muted);
  font: inherit;
  font-size: 0.9375rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.app-nav-item:hover { background: var(--l-surface-2); color: var(--l-ink); }
.app-nav-item[aria-current='page'] {
  background: var(--l-bg);
  color: var(--l-ink);
  font-weight: 500;
  box-shadow: inset 0 0 0 1px var(--l-hair);
}
.app-utility { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--l-hair); }

.app-title { font-size: 1.75rem; line-height: 1.15; font-weight: 600; letter-spacing: -0.03em; }

.app-card {
  overflow: hidden;
  border: 1px solid var(--l-hair);
  border-radius: 8px;
  background: var(--l-bg);
  transition: border-color 150ms ease-out;
}
.app-card:hover { border-color: var(--l-hair-strong); }

.app-thumb { aspect-ratio: 4 / 3; overflow: hidden; background: var(--l-surface); border-bottom: 1px solid var(--l-hair); }
.app-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
.app-thumb--empty { display: flex; align-items: center; justify-content: center; color: var(--l-muted); font-size: 0.8125rem; }

.app-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  border: 1px solid var(--l-hair-strong);
  border-radius: 6px;
  background: transparent;
  color: var(--l-muted);
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.app-iconbtn:hover { background: var(--l-surface); color: var(--l-ink); }

.app-seg { display: inline-flex; overflow: hidden; border: 1px solid var(--l-hair-strong); border-radius: 6px; }
.app-seg button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border: 0;
  background: transparent;
  color: var(--l-muted);
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.app-seg button:hover { background: var(--l-surface); color: var(--l-ink); }
.app-seg button[aria-pressed='true'] { background: var(--l-ink); color: var(--l-ink-fg); }

.app-newtile {
  display: flex;
  width: 100%;
  min-height: 14rem;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px dashed var(--l-hair-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--l-muted);
  font: inherit;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.app-newtile:hover { background: var(--l-surface); color: var(--l-ink); }

.app-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.app-table th {
  padding: 0 0.75rem 0.625rem;
  border-bottom: 1px solid var(--l-hair);
  color: var(--l-muted);
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-align: left;
  text-transform: uppercase;
}
.app-table td { padding: 0.75rem; border-bottom: 1px solid var(--l-hair); vertical-align: middle; }

.app-skeleton { background: var(--l-surface-2); border-radius: 6px; }
```

- [ ] **Step 5: Create `client/src/components/app-shell/nav-items.ts`**

```ts
import { FileText, Mail, ScanText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  key: 'resumes' | 'letters' | 'ats';
  label: string;
  to: string;
  icon: LucideIcon;
  pendingMessage: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'resumes', label: 'Resumes', to: '/dashboard', icon: FileText, pendingMessage: 'Opening resumes...' },
  { key: 'letters', label: 'Cover letters', to: '/cl-dashboard', icon: Mail, pendingMessage: 'Opening cover letters...' },
  { key: 'ats', label: 'ATS scanner', to: '/ats-scanner', icon: ScanText, pendingMessage: 'Opening the ATS scanner...' },
];

export const isActive = (pathname: string, to: string) => pathname === to || pathname.startsWith(`${to}/`);
```

- [ ] **Step 6: Create `client/src/components/app-shell/AppShell.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, LogOut, Menu, X } from 'lucide-react';
import '@/styles/landing.css';
import '@/styles/dashboard.css';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutDialog from '@/components/LogoutDialog';
import { usePendingNavigation } from '@/hooks/usePendingNavigation';
import { NAV_ITEMS, isActive } from './nav-items';

const BRAND = 'ResumeForge';
const MENU_ID = 'app-mobile-menu';

const isPlainLeftClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

interface NavListProps {
  pathname: string;
  pendingKey: string | null;
  go: (key: string, to: string, message: string) => void;
}

function NavList({ pathname, pendingKey, go }: NavListProps) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.to);
        const pending = pendingKey === `nav:${item.key}`;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            to={item.to}
            className="app-nav-item"
            aria-current={active ? 'page' : undefined}
            aria-busy={pending || undefined}
            onClick={(event) => {
              if (active || !isPlainLeftClick(event)) return;
              event.preventDefault();
              go(`nav:${item.key}`, item.to, item.pendingMessage);
            }}
          >
            {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Icon aria-hidden="true" className="size-4" />}
            {pending ? 'Opening...' : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Utilities({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="app-utility mt-auto flex flex-col gap-1">
      <div className="flex items-center justify-between px-3">
        <span className="l-muted text-[0.9375rem]">Theme</span>
        <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
      </div>
      <button type="button" className="app-nav-item w-full" onClick={onLogout}>
        <LogOut aria-hidden="true" className="size-4" />
        Log out
      </button>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { pendingKey, go } = usePendingNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const brand = (
    <span className="l-ink flex items-center gap-2.5 font-semibold">
      <img src="/icon.png" alt="" width={24} height={24} className="size-6 rounded-md" />
      {BRAND}
    </span>
  );

  return (
    <div className="app-shell lg:flex">
      <a href="#main" className="l-skip">
        Skip to content
      </a>

      <aside className="app-sidebar hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto p-3 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-3 py-2">{brand}</div>
        <NavList pathname={pathname} pendingKey={pendingKey} go={go} />
        <Utilities onLogout={() => setLogoutOpen(true)} />
      </aside>

      <header className="app-topbar sticky top-0 z-40 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          {brand}
          <button
            type="button"
            className="l-ink inline-flex min-h-11 min-w-11 items-center justify-center rounded-md"
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>
        {menuOpen && (
          <div id={MENU_ID} className="app-topbar-panel flex flex-col gap-4 px-3 pb-3 pt-2">
            <NavList pathname={pathname} pendingKey={pendingKey} go={go} />
            <Utilities onLogout={() => setLogoutOpen(true)} />
          </div>
        )}
      </header>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1">
        {children}
      </main>

      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
```

- [ ] **Step 7: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/app-shell && npx tsc -b && npx eslint src/components/app-shell`
Expected: all AppShell tests PASS; tsc exit 0; eslint prints nothing.

- [ ] **Step 8: Commit**

```bash
git add client/src/styles/landing.css client/src/styles/dashboard.css client/src/components/app-shell/nav-items.ts client/src/components/app-shell/AppShell.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add app shell with sidebar and shared tokens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Resume card, table, menu, header and states

**Files:**
- Create: `client/src/components/dashboard/types.ts`
- Create: `client/src/components/dashboard/ResumeActionsMenu.tsx`
- Create: `client/src/components/dashboard/ResumeCard.tsx`
- Create: `client/src/components/dashboard/ResumeTable.tsx`
- Create: `client/src/components/dashboard/DashboardHeader.tsx`
- Create: `client/src/components/dashboard/DashboardStates.tsx`
- Test (temporary, never committed): `client/src/components/dashboard/dashboard-parts.test.tsx`

**Interfaces:**
- Consumes: `ResumeSummary` from `@/types` (`{ id, resume_name, resume_slug_name, template, updated_at }`), `TEMPLATE_THUMBS` (`Record<string, string>`), `formatTemplateName`, `formatDateDisplay` from `@/utils/helper`, `.app-*` and `.l-*` classes.
- Produces (`types.ts`): `type ViewMode = 'grid' | 'list'`, `type DashboardStatus = 'loading' | 'ready' | 'error'`, `interface ResumeHandlers { onEdit(resume: ResumeSummary): void; onClone(id: string): void; onRename(resume: ResumeSummary): void; onDelete(id: string): void }`.
- Produces: default exports `ResumeActionsMenu({ name, onClone, onRename, onDelete })`, `ResumeCard({ resume, pending } & ResumeHandlers)`, `ResumeTable({ resumes, pendingEditId } & ResumeHandlers)`, `DashboardHeader({ count: number | null, viewMode, onViewModeChange, onCreate })`; named exports `ResumeSkeleton({ viewMode })`, `EmptyState({ onCreate })`, `ErrorState({ onRetry })` from `DashboardStates.tsx`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/dashboard/dashboard-parts.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ResumeSummary } from '@/types';
import ResumeCard from './ResumeCard';
import ResumeTable from './ResumeTable';
import DashboardHeader from './DashboardHeader';
import { EmptyState, ErrorState, ResumeSkeleton } from './DashboardStates';

const noop = () => {};
const handlers = { onEdit: noop, onClone: noop, onRename: noop, onDelete: noop };
const make = (over: Partial<ResumeSummary> = {}): ResumeSummary => ({
  id: 'r1',
  resume_name: 'Frontend Developer 2025',
  resume_slug_name: 'frontend-developer-2025',
  template: 'athena',
  updated_at: '2026-10-10T12:00:00Z',
  ...over,
});

describe('ResumeCard', () => {
  it('shows name, template label, an always-visible Edit and the more menu', () => {
    const html = renderToStaticMarkup(<ResumeCard resume={make()} pending={false} {...handlers} />);
    expect(html).toContain('Frontend Developer 2025');
    expect(html).toContain('Athena');
    expect(html).toContain('aria-label="Edit Frontend Developer 2025"');
    expect(html).toContain('aria-label="More actions for Frontend Developer 2025"');
    expect(html).toContain('<img');
    expect(html).not.toMatch(/opacity-0|group-hover|scale-1/);
  });

  it('falls back to Untitled', () => {
    const html = renderToStaticMarkup(<ResumeCard resume={make({ resume_name: '' })} pending={false} {...handlers} />);
    expect(html).toContain('Untitled');
  });

  it('shows the placeholder, not an image, when there is no template or no thumbnail for it', () => {
    for (const template of ['', 'not_a_real_template']) {
      const html = renderToStaticMarkup(<ResumeCard resume={make({ template })} pending={false} {...handlers} />);
      expect(html).toContain('No template yet');
      expect(html).not.toContain('<img');
    }
  });

  it('shows Opening... and aria-busy only while pending', () => {
    const busy = renderToStaticMarkup(<ResumeCard resume={make()} pending={true} {...handlers} />);
    const idle = renderToStaticMarkup(<ResumeCard resume={make()} pending={false} {...handlers} />);
    expect(busy).toContain('Opening...');
    expect(busy).toContain('aria-busy="true"');
    expect(idle).not.toContain('Opening...');
    expect(idle).not.toContain('aria-busy');
  });
});

describe('ResumeTable', () => {
  const html = renderToStaticMarkup(
    <ResumeTable resumes={[make(), make({ id: 'r2', template: '', resume_name: 'Second' })]} pendingEditId={null} {...handlers} />,
  );

  it('renders column headers, one row per resume, the slug and the actions', () => {
    for (const heading of ['Name', 'Template', 'Last edited']) expect(html).toContain(heading);
    expect(html.split('<tr').length - 1).toBe(3);
    expect(html).toContain('frontend-developer-2025');
    expect(html.split('aria-label="Edit ').length - 1).toBe(2);
    expect(html.split('aria-label="More actions for ').length - 1).toBe(2);
  });

  it('uses a placeholder for a resume without a template', () => {
    expect(html.split('<img').length - 1).toBe(1);
  });
});

describe('DashboardHeader', () => {
  const header = (count: number | null, viewMode: 'grid' | 'list' = 'grid') =>
    renderToStaticMarkup(<DashboardHeader count={count} viewMode={viewMode} onViewModeChange={noop} onCreate={noop} />);

  it('pluralizes the count and shows nothing while it is unknown', () => {
    expect(header(1)).toContain('1 resume<');
    expect(header(3)).toContain('3 resumes');
    expect(header(null)).not.toMatch(/\d resume/);
  });

  it('has one h1, a labeled toggle with aria-pressed, and the New resume button', () => {
    const html = header(2, 'list');
    expect(html.split('<h1').length - 1).toBe(1);
    expect(html).toContain('aria-label="Grid view"');
    expect(html).toContain('aria-label="List view"');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain('New resume');
  });
});

describe('states', () => {
  it('skeleton announces loading and is never the empty state', () => {
    const html = renderToStaticMarkup(<ResumeSkeleton viewMode="grid" />);
    expect(html).toContain('Loading resumes');
    expect(html).toContain('role="status"');
    expect(html).not.toContain('No resumes yet');
  });

  it('empty state invites creating the first resume', () => {
    const html = renderToStaticMarkup(<EmptyState onCreate={noop} />);
    expect(html).toContain('No resumes yet');
    expect(html).toContain('New resume');
    expect(html).not.toMatch(/gradient/);
  });

  it('error state is an alert with Retry', () => {
    const html = renderToStaticMarkup(<ErrorState onRetry={noop} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Retry');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/dashboard/dashboard-parts.test.tsx`
Expected: FAIL, "Failed to resolve import './ResumeCard'".

- [ ] **Step 3: Create `client/src/components/dashboard/types.ts`**

```ts
import type { ResumeSummary } from '@/types';

export type ViewMode = 'grid' | 'list';
export type DashboardStatus = 'loading' | 'ready' | 'error';

export interface ResumeHandlers {
  onEdit: (resume: ResumeSummary) => void;
  onClone: (id: string) => void;
  onRename: (resume: ResumeSummary) => void;
  onDelete: (id: string) => void;
}
```

- [ ] **Step 4: Create `client/src/components/dashboard/ResumeActionsMenu.tsx`**

```tsx
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ResumeActionsMenuProps {
  name: string;
  onClone: () => void;
  onRename: () => void;
  onDelete: () => void;
}

// modal={false}: Rename and Delete open a Dialog from a menu item; a modal menu would leave the page
// with `pointer-events: none` after the dialog closes.
export default function ResumeActionsMenu({ name, onClone, onRename, onDelete }: ResumeActionsMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="app-iconbtn" aria-label={`More actions for ${name}`}>
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onClone}>
          <Copy aria-hidden="true" />
          Clone
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>
          <Pencil aria-hidden="true" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 5: Create `client/src/components/dashboard/ResumeCard.tsx`**

```tsx
import { Loader2 } from 'lucide-react';
import type { ResumeSummary } from '@/types';
import { TEMPLATE_THUMBS } from '@/utils/template-thumbs';
import { formatDateDisplay, formatTemplateName } from '@/utils/helper';
import ResumeActionsMenu from './ResumeActionsMenu';
import type { ResumeHandlers } from './types';

interface ResumeCardProps extends ResumeHandlers {
  resume: ResumeSummary;
  pending: boolean;
}

export default function ResumeCard({ resume, pending, onEdit, onClone, onRename, onDelete }: ResumeCardProps) {
  const name = resume.resume_name || 'Untitled';
  const thumb = resume.template ? TEMPLATE_THUMBS[resume.template] : undefined;

  return (
    <article className="app-card flex h-full flex-col">
      <div className={thumb ? 'app-thumb' : 'app-thumb app-thumb--empty'}>
        {thumb ? <img src={thumb} alt="" width={280} height={373} loading="lazy" /> : 'No template yet'}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="min-w-0">
          <h2 className="l-ink m-0 break-words text-[0.9375rem] font-semibold">{name}</h2>
          <p className="l-muted m-0 mt-1 break-words text-[0.8125rem]">
            {resume.template ? formatTemplateName(resume.template) : 'No template'} · {formatDateDisplay(resume.updated_at)}
          </p>
        </div>
        <div className="mt-auto flex items-center gap-2">
          <button
            type="button"
            className="l-btn l-btn--primary flex-1"
            aria-label={`Edit ${name}`}
            aria-busy={pending || undefined}
            onClick={() => onEdit(resume)}
          >
            {pending ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Opening...
              </>
            ) : (
              'Edit'
            )}
          </button>
          <ResumeActionsMenu
            name={name}
            onClone={() => onClone(resume.id)}
            onRename={() => onRename(resume)}
            onDelete={() => onDelete(resume.id)}
          />
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 6: Create `client/src/components/dashboard/ResumeTable.tsx`**

```tsx
import { Loader2 } from 'lucide-react';
import type { ResumeSummary } from '@/types';
import { TEMPLATE_THUMBS } from '@/utils/template-thumbs';
import { formatDateDisplay, formatTemplateName } from '@/utils/helper';
import ResumeActionsMenu from './ResumeActionsMenu';
import type { ResumeHandlers } from './types';

interface ResumeTableProps extends ResumeHandlers {
  resumes: ResumeSummary[];
  pendingEditId: string | null;
}

export default function ResumeTable({ resumes, pendingEditId, onEdit, onClone, onRename, onDelete }: ResumeTableProps) {
  return (
    <table className="app-table">
      <caption className="sr-only">Your resumes</caption>
      <thead>
        <tr>
          <th scope="col" className="w-16">
            <span className="sr-only">Preview</span>
          </th>
          <th scope="col">Name</th>
          <th scope="col" className="hidden md:table-cell">Template</th>
          <th scope="col" className="hidden md:table-cell">Last edited</th>
          <th scope="col">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {resumes.map((resume) => {
          const name = resume.resume_name || 'Untitled';
          const thumb = resume.template ? TEMPLATE_THUMBS[resume.template] : undefined;
          const template = resume.template ? formatTemplateName(resume.template) : 'No template';
          const date = formatDateDisplay(resume.updated_at);
          const pending = pendingEditId === resume.id;
          return (
            <tr key={resume.id}>
              <td>
                {thumb ? (
                  <img src={thumb} alt="" width={36} height={48} loading="lazy" className="app-card h-12 w-9 object-cover object-top" />
                ) : (
                  <div aria-hidden="true" className="l-border h-12 w-9 rounded-sm border border-dashed" />
                )}
              </td>
              <td className="min-w-0">
                <div className="l-ink break-words font-semibold">{name}</div>
                <div className="l-muted break-all font-mono text-xs">{resume.resume_slug_name}</div>
                <div className="l-muted mt-1 text-[0.8125rem] md:hidden">
                  {template} · {date}
                </div>
              </td>
              <td className="l-muted hidden md:table-cell">{template}</td>
              <td className="l-muted hidden md:table-cell">{date}</td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="l-btn l-btn--primary"
                    aria-label={`Edit ${name}`}
                    aria-busy={pending || undefined}
                    onClick={() => onEdit(resume)}
                  >
                    {pending ? (
                      <>
                        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      'Edit'
                    )}
                  </button>
                  <ResumeActionsMenu
                    name={name}
                    onClone={() => onClone(resume.id)}
                    onRename={() => onRename(resume)}
                    onDelete={() => onDelete(resume.id)}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 7: Create `client/src/components/dashboard/DashboardHeader.tsx`**

```tsx
import { Grid3X3, List, Plus } from 'lucide-react';
import type { ViewMode } from './types';

interface DashboardHeaderProps {
  count: number | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreate: () => void;
}

export default function DashboardHeader({ count, viewMode, onViewModeChange, onCreate }: DashboardHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="app-title m-0">Resumes</h1>
        <p className="l-muted m-0 mt-1 text-sm">
          {count === null ? ' ' : `${count} ${count === 1 ? 'resume' : 'resumes'}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="app-seg" role="group" aria-label="View mode">
          <button type="button" aria-label="Grid view" aria-pressed={viewMode === 'grid'} onClick={() => onViewModeChange('grid')}>
            <Grid3X3 aria-hidden="true" className="size-4" />
          </button>
          <button type="button" aria-label="List view" aria-pressed={viewMode === 'list'} onClick={() => onViewModeChange('list')}>
            <List aria-hidden="true" className="size-4" />
          </button>
        </div>
        <button type="button" className="l-btn l-btn--primary" onClick={onCreate}>
          <Plus aria-hidden="true" className="size-4" />
          New resume
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create `client/src/components/dashboard/DashboardStates.tsx`**

```tsx
import { Plus } from 'lucide-react';
import type { ViewMode } from './types';

const SKELETON_COUNT = 6;

export function ResumeSkeleton({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading resumes</span>
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div key={index} className="app-card">
              <div className="app-skeleton aspect-[4/3] animate-pulse rounded-none" />
              <div className="flex flex-col gap-3 p-4">
                <div className="app-skeleton h-4 w-2/3 animate-pulse" />
                <div className="app-skeleton h-3 w-1/2 animate-pulse" />
                <div className="app-skeleton h-11 w-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div key={index} className="app-skeleton h-16 w-full animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <h2 className="m-0 text-xl font-semibold tracking-[-0.02em]">No resumes yet</h2>
      <p className="l-muted m-0 mt-2 max-w-sm">Create your first resume, choose a template and start writing.</p>
      <button type="button" className="l-btn l-btn--primary mt-6" onClick={onCreate}>
        <Plus aria-hidden="true" className="size-4" />
        New resume
      </button>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-20 text-center">
      <h2 className="m-0 text-xl font-semibold tracking-[-0.02em]">We could not load your resumes</h2>
      <p className="l-muted m-0 mt-2 max-w-sm">Check your connection and try again.</p>
      <button type="button" className="l-btn l-btn--ghost mt-6" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
```

- [ ] **Step 9: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/dashboard && npx tsc -b && npx eslint src/components/dashboard`
Expected: all tests PASS; tsc exit 0; eslint prints nothing. (If the `'1 resume<'` assertion fails because React inserts comment nodes between text parts, fix the component to render the count as a single string, as written, rather than loosening the test.)

- [ ] **Step 10: Commit**

```bash
git add client/src/components/dashboard/types.ts client/src/components/dashboard/ResumeActionsMenu.tsx client/src/components/dashboard/ResumeCard.tsx client/src/components/dashboard/ResumeTable.tsx client/src/components/dashboard/DashboardHeader.tsx client/src/components/dashboard/DashboardStates.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add resume card, table, header and states

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: DashboardView and dialogs

**Files:**
- Create: `client/src/components/dashboard/DashboardView.tsx`
- Create: `client/src/components/dashboard/ResumeFormDialog.tsx`
- Create: `client/src/components/dashboard/DeleteResumeDialog.tsx`
- Test (temporary, never committed): `client/src/components/dashboard/dashboard-view.test.tsx`

**Interfaces:**
- Consumes: everything produced in Task 4.
- Produces: default export `DashboardView(props: DashboardViewProps)` where `DashboardViewProps = ResumeHandlers & { resumes: ResumeSummary[]; status: DashboardStatus; viewMode: ViewMode; pendingEditId: string | null; onViewModeChange(mode: ViewMode): void; onCreate(): void; onRetry(): void }` (exported as a type from `DashboardView.tsx`).
- Produces: default export `ResumeFormDialog({ open, onOpenChange, isEdit, name, slug, onNameChange, onSlugChange, onSubmit })` with `onNameChange: (value: string) => void`, `onSlugChange: (event: React.ChangeEvent<HTMLInputElement>) => void`, `onSubmit: () => void`.
- Produces: default export `DeleteResumeDialog({ open, onOpenChange, onCancel, onConfirm })`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/dashboard/dashboard-view.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ResumeSummary } from '@/types';
import DashboardView from './DashboardView';
import ResumeFormDialog from './ResumeFormDialog';
import DeleteResumeDialog from './DeleteResumeDialog';
import type { DashboardStatus, ViewMode } from './types';

const noop = () => {};
const make = (id: string, over: Partial<ResumeSummary> = {}): ResumeSummary => ({
  id,
  resume_name: `Resume ${id}`,
  resume_slug_name: `resume-${id}`,
  template: 'zeus',
  updated_at: '2026-10-10T12:00:00Z',
  ...over,
});

const view = (status: DashboardStatus, resumes: ResumeSummary[], viewMode: ViewMode = 'grid', pendingEditId: string | null = null) =>
  renderToStaticMarkup(
    <DashboardView
      resumes={resumes}
      status={status}
      viewMode={viewMode}
      pendingEditId={pendingEditId}
      onViewModeChange={noop}
      onCreate={noop}
      onRetry={noop}
      onEdit={noop}
      onClone={noop}
      onRename={noop}
      onDelete={noop}
    />,
  );

describe('DashboardView status handling', () => {
  it('loading shows the skeleton, never the empty state, and no count', () => {
    const html = view('loading', []);
    expect(html).toContain('Loading resumes');
    expect(html).not.toContain('No resumes yet');
    expect(html).not.toMatch(/\d resumes?</);
  });

  it('error shows the alert and no list', () => {
    const html = view('error', [make('1')]);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('Resume 1');
  });

  it('ready with no resumes shows the empty state', () => {
    const html = view('ready', []);
    expect(html).toContain('No resumes yet');
    expect(html).toContain('0 resumes');
  });
});

describe('DashboardView ready', () => {
  const resumes = [make('1'), make('2', { template: '' }), make('3', { resume_name: '' })];

  it('grid shows every card, the count and the New resume tile', () => {
    const html = view('ready', resumes, 'grid');
    expect(html).toContain('3 resumes');
    expect(html.split('<article').length - 1).toBe(3);
    expect(html).toContain('Untitled');
    expect(html.split('New resume').length - 1).toBeGreaterThanOrEqual(2);
    expect(html).toContain('app-newtile');
  });

  it('list shows a table instead of cards', () => {
    const html = view('ready', resumes, 'list');
    expect(html).toContain('<table');
    expect(html).not.toContain('<article');
  });

  it('marks only the pending resume busy', () => {
    const html = view('ready', resumes, 'grid', '2');
    expect(html.split('aria-busy="true"').length - 1).toBe(1);
    expect(html.split('Opening...').length - 1).toBe(1);
  });

  it('keeps the list visible after a refresh (ready never regresses to an error here)', () => {
    expect(view('ready', resumes)).not.toContain('role="alert"');
  });
});

describe('dialogs', () => {
  it('render nothing while closed', () => {
    expect(
      renderToStaticMarkup(
        <ResumeFormDialog open={false} onOpenChange={noop} isEdit={false} name="" slug="" onNameChange={noop} onSlugChange={noop} onSubmit={noop} />,
      ),
    ).toBe('');
    expect(renderToStaticMarkup(<DeleteResumeDialog open={false} onOpenChange={noop} onCancel={noop} onConfirm={noop} />)).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/dashboard/dashboard-view.test.tsx`
Expected: FAIL, "Failed to resolve import './DashboardView'".

- [ ] **Step 3: Create `client/src/components/dashboard/DashboardView.tsx`**

```tsx
import { Plus } from 'lucide-react';
import type { ResumeSummary } from '@/types';
import DashboardHeader from './DashboardHeader';
import ResumeCard from './ResumeCard';
import ResumeTable from './ResumeTable';
import { EmptyState, ErrorState, ResumeSkeleton } from './DashboardStates';
import type { DashboardStatus, ResumeHandlers, ViewMode } from './types';

export interface DashboardViewProps extends ResumeHandlers {
  resumes: ResumeSummary[];
  status: DashboardStatus;
  viewMode: ViewMode;
  pendingEditId: string | null;
  onViewModeChange: (mode: ViewMode) => void;
  onCreate: () => void;
  onRetry: () => void;
}

export default function DashboardView({
  resumes,
  status,
  viewMode,
  pendingEditId,
  onViewModeChange,
  onCreate,
  onRetry,
  onEdit,
  onClone,
  onRename,
  onDelete,
}: DashboardViewProps) {
  const handlers = { onEdit, onClone, onRename, onDelete };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
      <DashboardHeader
        count={status === 'ready' ? resumes.length : null}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onCreate={onCreate}
      />

      {status === 'loading' && <ResumeSkeleton viewMode={viewMode} />}
      {status === 'error' && <ErrorState onRetry={onRetry} />}
      {status === 'ready' && resumes.length === 0 && <EmptyState onCreate={onCreate} />}

      {status === 'ready' && resumes.length > 0 && viewMode === 'grid' && (
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {resumes.map((resume) => (
            <li key={resume.id}>
              <ResumeCard resume={resume} pending={pendingEditId === resume.id} {...handlers} />
            </li>
          ))}
          <li>
            <button type="button" className="app-newtile" onClick={onCreate}>
              <Plus aria-hidden="true" className="size-5" />
              New resume
            </button>
          </li>
        </ul>
      )}

      {status === 'ready' && resumes.length > 0 && viewMode === 'list' && (
        <ResumeTable resumes={resumes} pendingEditId={pendingEditId} {...handlers} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `client/src/components/dashboard/ResumeFormDialog.tsx`**

```tsx
import type { ChangeEvent } from 'react';
import { Edit, FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResumeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  name: string;
  slug: string;
  onNameChange: (value: string) => void;
  onSlugChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

// Portaled outside .app-shell, so it uses the global shadcn tokens (bg-foreground / text-background) for the ink button.
// Title and description keep today's wording in both modes (the spec says dialog wording is unchanged).
export default function ResumeFormDialog({ open, onOpenChange, isEdit, name, slug, onNameChange, onSlugChange, onSubmit }: ResumeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Resume</DialogTitle>
          <DialogDescription>
            Enter a name and slug for your new resume.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resume-name">Resume name</Label>
            <Input id="resume-name" placeholder="Resume Name" value={name} onChange={(event) => onNameChange(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resume-slug">Resume slug</Label>
            <Input id="resume-slug" placeholder="Resume Slug" value={slug} onChange={onSlugChange} />
            <small className="text-muted-foreground text-xs">This will be the file name saved on your computer.</small>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} className="bg-foreground text-background hover:bg-foreground/90 flex items-center gap-2">
            {isEdit ? 'Rename Resume' : 'Create Resume'}
            {isEdit ? <Edit className="size-4" /> : <FilePlus2 className="size-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Create `client/src/components/dashboard/DeleteResumeDialog.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DeleteResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteResumeDialog({ open, onOpenChange, onCancel, onConfirm }: DeleteResumeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Resume?</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to delete this resume? This action cannot be undone.
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/dashboard && npx tsc -b && npx eslint src/components/dashboard`
Expected: all dashboard tests PASS (parts and view); tsc exit 0; eslint prints nothing.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/dashboard/DashboardView.tsx client/src/components/dashboard/ResumeFormDialog.tsx client/src/components/dashboard/DeleteResumeDialog.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add dashboard view and dialogs

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Container rewrite, footer hide and build

**Files:**
- Modify (full replace): `client/src/pages/Dashboard.tsx`
- Modify: `client/src/routes.tsx:25` (one added condition)

**Interfaces:**
- Consumes: `AppShell` (Task 3), `usePendingNavigation` (Task 1), `DashboardView`, `ResumeFormDialog`, `DeleteResumeDialog` and the types (Tasks 4 and 5).
- Produces: default export `Dashboard` (route element, already lazy-imported by `routes.tsx`).

- [ ] **Step 1: Replace `client/src/pages/Dashboard.tsx` entirely**

All handlers below are the existing ones with their request URLs, store calls and toasts unchanged. The only differences: the 1.5 s redirect timeouts are gone, Edit goes through `go(...)`, and `status` is driven by the initial fetch only.

```tsx
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import client from '@/api/axiosInstance';
import AppShell from '@/components/app-shell/AppShell';
import DashboardView from '@/components/dashboard/DashboardView';
import ResumeFormDialog from '@/components/dashboard/ResumeFormDialog';
import DeleteResumeDialog from '@/components/dashboard/DeleteResumeDialog';
import type { DashboardStatus, ViewMode } from '@/components/dashboard/types';
import { usePendingNavigation } from '@/hooks/usePendingNavigation';
import type { ResumeSummary } from '@/types';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useMainStore } from '@/store/useMainStore';
import { getCsrfToken, slugify } from '@/utils/helper';

const STORAGE_KEY = 'resumes';

const Dashboard: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const { pendingKey, go } = usePendingNavigation();

  // resumes - zustand state
  const resumes = useDashboardStore((state) => state.resumes);
  const resumeName = useDashboardStore((state) => state.resumeName);
  const resumeSlug = useDashboardStore((state) => state.resumeSlug);
  const userId = useMainStore((state) => state.userId);
  const editIndex = useMainStore((state) => state.editIndex);

  // set - zustand set state
  const setResumes = useDashboardStore((state) => state.setResumes);
  const setResumeName = useDashboardStore((state) => state.setResumeName);
  const setResumeSlug = useDashboardStore((state) => state.setResumeSlug);
  const setUserId = useMainStore((state) => state.setUserId);
  const setEditIndex = useMainStore((state) => state.setEditIndex);

  const openDeleteDialog = (resumeId: string) => {
    setResumeToDelete(resumeId);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setResumeToDelete(null);
    setDeleteDialogOpen(false);
  };

  const confirmDeleteResume = () => {
    if (resumeToDelete) {
      handleDeleteResume(resumeToDelete);
      closeDeleteDialog();
    }
  };

  const fetchResumes = async () => {
    try {
      const response = await client.get(`/resume/fetch-resumes/${userId}`);
      // set All resumes on localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data?.resumes));
      setResumes(response.data?.resumes);
    } catch (error) {
      console.error('Failed to fetch all resumes: ', error);
      throw error;
    }
  };

  // Only the initial load drives `status`; later refreshes keep the list on screen even if they fail.
  const loadInitial = async () => {
    setStatus('loading');
    try {
      await fetchResumes();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    toast.dismiss(); // dismiss all toast upon loading
    setUserId(Cookies.get('user.id') || '');
    localStorage.clear();
  }, []);

  // Load resumes from the API
  useEffect(() => {
    getCsrfToken();
    if (userId) {
      loadInitial();
    }
  }, [userId]);

  // Submit the resume => add new or rename
  const handleResumeSubmit = async () => {
    if (!resumeName || !resumeSlug) {
      if (editIndex) {
        toast.error('Please enter a name and slug for your resume.');
      } else {
        toast.error('Please enter a name and slug for your new resume.');
      }
      return;
    }
    try {
      const url = editIndex ? `rename/${resumeToDelete}/${userId}` : `create-init/${userId}`;
      await client.post(`/resume/${url}`, {
        name: resumeName,
        slug: resumeSlug,
      });
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to add new resume: ', error);
      throw error;
    }
    fetchResumes();
  };

  const handleRename = async (resume: ResumeSummary) => {
    setResumeName(resume.resume_name);
    setResumeSlug(resume.resume_slug_name);
    setResumeToDelete(resume.id); // not for deleting, just for renaming
    setEditIndex(true);
    setCreateDialogOpen(true);
  };

  // Edit a resume: go to its templates page (no template yet) or its preview
  const handleEditResume = (resume: ResumeSummary) => {
    const key = `edit:${resume.id}`;
    if (!resume.template) {
      go(key, `/templates?resumeId=${resume.id}`, 'Opening templates...', () => {
        localStorage.removeItem('resumes');
        localStorage.setItem('slug', resume.resume_slug_name);
      });
    } else {
      go(key, `/preview?template=${resume.template}&resumeId=${resume.id}`, 'Opening resume...', () => {
        localStorage.setItem('id', resume.id);
        localStorage.setItem('template', resume.template);
        localStorage.setItem('slug', resume.resume_slug_name);
        localStorage.removeItem('resumes');
      });
    }
  };

  const handleDeleteResume = (resumeId: string) => {
    client.delete(`/resume/delete-resume/${resumeId}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchResumes();
      })
      .catch(error => {
        console.error("Failed to delete: ", error);
        throw error;
      });
  };

  const handleClone = (resumeId: string) => {
    client.post(`/resume/clone/${resumeId}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchResumes();
      }).catch(err => {
        console.error("Failed to Clone Resume: ", err);
        throw err;
      })
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const slug = slugify(value);
    setResumeSlug(slug);
  };

  const pendingEditId = pendingKey?.startsWith('edit:') ? pendingKey.slice('edit:'.length) : null;

  return (
    <AppShell>
      <DashboardView
        resumes={resumes}
        status={status}
        viewMode={viewMode}
        pendingEditId={pendingEditId}
        onViewModeChange={setViewMode}
        onCreate={() => setCreateDialogOpen(true)}
        onRetry={loadInitial}
        onEdit={handleEditResume}
        onClone={handleClone}
        onRename={handleRename}
        onDelete={openDeleteDialog}
      />

      <DeleteResumeDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setResumeToDelete(null);
        }}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteResume}
      />

      <ResumeFormDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setResumeName('');
            setResumeSlug('');
            setEditIndex(false);
          }
        }}
        isEdit={editIndex}
        name={resumeName}
        slug={resumeSlug}
        onNameChange={setResumeName}
        onSlugChange={handleSlugChange}
        onSubmit={handleResumeSubmit}
      />
    </AppShell>
  );
};

export default Dashboard;
```

- [ ] **Step 2: Hide the global footer on `/dashboard` in `client/src/routes.tsx`**

The condition currently starts `const showFooter = location.pathname !== '/' && !location.pathname.startsWith('/preview')`. Insert `!location.pathname.startsWith('/dashboard') &&` right after `location.pathname !== '/' &&`, so it reads:

```tsx
  const showFooter = location.pathname !== '/' && !location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/preview') && ...
```

(Keep the rest of the line exactly as it is. `startsWith('/dashboard')` does not match `/cl-dashboard`, which keeps its footer.)

- [ ] **Step 3: Check that `status` is only ever set by the initial load**

Run (from the repo root): `grep -n "setStatus" client/src/pages/Dashboard.tsx`
Expected: exactly four lines, all inside `loadInitial` or its `useState` declaration (`useState<DashboardStatus>`, `setStatus('loading')`, `setStatus('ready')`, `setStatus('error')`). If `setStatus` appears anywhere else, a refresh could regress the list to an error; remove that call.

- [ ] **Step 4: Type-check, lint, run all temporary tests, build**

Run (from `client/`): `npx tsc -b && npx eslint src/pages/Dashboard.tsx src/routes.tsx src/components/app-shell src/components/dashboard src/hooks src/components/LogoutDialog.tsx src/components/LogoutButton.tsx && npx vitest run && npx vite build --outDir node_modules/.tmp/dashboard-build --emptyOutDir`
Expected: tsc exit 0; eslint reports at most the two pre-existing `react-hooks/exhaustive-deps` warnings in `Dashboard.tsx` (the same two as before this work: missing `setUserId` and `loadInitial`/`fetchResumes`) and no errors; all temporary tests PASS; build completes (the chunk-size warning is the app's existing bundle). The throwaway build output lives under `node_modules`, so `client/dist/` is not touched; run `git status --short` afterwards and expect only the two modified files plus untracked temporary tests.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Dashboard.tsx client/src/routes.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): redesign dashboard page with sidebar and loading feedback

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Browser verification and cleanup

**Files:**
- Create (temporary harness, never committed): `client/harness.html`, `client/src/harness.tsx`
- Delete: the harness, every `*.test.ts(x)` created in Tasks 1 to 5, and the build output
- No product code changes unless a check fails (then fix in the owning file, re-run, and commit that fix separately)

- [ ] **Step 1: Create the harness**

Create `client/harness.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/index.css" />
    <title>Dashboard harness</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/harness.tsx"></script>
  </body>
</html>
```

Create `client/src/harness.tsx` (fake data only; the URL query chooses the state: `?status=loading|error|ready`, `?empty=1`, `?view=list`, `?long=1`):

```tsx
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './contexts/ThemeContext';
import AppShell from './components/app-shell/AppShell';
import DashboardView from './components/dashboard/DashboardView';
import ResumeFormDialog from './components/dashboard/ResumeFormDialog';
import DeleteResumeDialog from './components/dashboard/DeleteResumeDialog';
import type { DashboardStatus, ViewMode } from './components/dashboard/types';
import type { ResumeSummary } from './types';

const params = new URLSearchParams(location.search);
const LONG = 'A very long resume name that keeps going and going to prove that wrapping works properly in cards and rows';
const data: ResumeSummary[] = params.get('empty')
  ? []
  : [
      { id: '1', resume_name: params.get('long') ? LONG : 'Frontend Developer 2025', resume_slug_name: params.get('long') ? 'a-very-long-slug-'.repeat(8) : 'frontend-developer-2025', template: 'athena', updated_at: '2026-10-10T12:00:00Z' },
      { id: '2', resume_name: 'Product Designer', resume_slug_name: 'product-designer', template: 'zeus', updated_at: '2026-10-02T09:30:00Z' },
      { id: '3', resume_name: 'Data Analyst', resume_slug_name: 'data-analyst', template: 'andromeda', updated_at: '2026-09-18T15:45:00Z' },
      { id: '4', resume_name: '', resume_slug_name: 'untitled', template: '', updated_at: '2026-09-18T15:45:00Z' },
    ];

function Harness() {
  const [viewMode, setViewMode] = useState<ViewMode>(params.get('view') === 'list' ? 'list' : 'grid');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const status = (params.get('status') as DashboardStatus) || 'ready';
  return (
    <AppShell>
      <DashboardView
        resumes={data}
        status={status}
        viewMode={viewMode}
        pendingEditId={null}
        onViewModeChange={setViewMode}
        onCreate={() => setFormOpen(true)}
        onRetry={() => console.log('retry')}
        onEdit={(r) => console.log('edit', r.id)}
        onClone={(id) => console.log('clone', id)}
        onRename={() => setFormOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />
      <DeleteResumeDialog open={deleteOpen} onOpenChange={setDeleteOpen} onCancel={() => setDeleteOpen(false)} onConfirm={() => setDeleteOpen(false)} />
      <ResumeFormDialog open={formOpen} onOpenChange={setFormOpen} isEdit={false} name="" slug="" onNameChange={() => {}} onSlugChange={() => {}} onSubmit={() => setFormOpen(false)} />
    </AppShell>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <MemoryRouter initialEntries={['/dashboard']}>
      <Toaster position="top-right" />
      <Routes>
        <Route path="*" element={<Harness />} />
      </Routes>
    </MemoryRouter>
  </ThemeProvider>,
);
```

- [ ] **Step 2: Start the dev server**

Run (from `client/`, in the background): `yarn dev`
Expected: Vite prints a local URL; note the port (5173, or the next free one). The harness is at `<url>/harness.html`.

- [ ] **Step 3: Visual pass (Claude in Chrome tools)**

Load the browser tools in one `ToolSearch` call, open a new tab, and open `<url>/harness.html`. For each of widths 375, 768 and 1440, in light and dark (switch with the sidebar or menu Theme toggle), check:
- Gallery default: sidebar, header, cards with thumbnails, the placeholder card, the dashed New resume tile; no hover-only actions anywhere.
- `?view=list`: table on desktop; rows stack on 375px with template and date under the name.
- `?status=loading`: skeleton (no empty-state flash). `?status=error`: alert with Retry. `?empty=1`: empty state.
- 375px: top bar with menu button; the menu opens with nav, Theme and Log out; it shows no horizontal scroll.

- [ ] **Step 4: Overflow, long names and keyboard (Review Focus 3)**

At widths 375, 768 and 1440 run `document.documentElement.scrollWidth <= window.innerWidth` on `?long=1` (grid) and `?long=1&view=list`. Expected: `true` for every combination. Then Tab through the page: skip link first (visible, jumps to main), sidebar items, Theme, Log out, the view toggle, New resume, each Edit and each more-menu button. Every focused element shows a visible ring.

- [ ] **Step 5: Menu to dialog and back (Review Focus 1)**

Open a card's more menu with the keyboard (Enter), choose Delete. Expected: the delete dialog opens. Press Cancel. Expected: the dialog closes and the page is clickable again (click the view toggle to prove it). Repeat with Rename (the form dialog opens, then Escape closes it and the page stays clickable). Also open the sidebar Log out: the existing confirm dialog appears; press Stay signed in.

- [ ] **Step 6: Stop the dev server, delete every temporary file, verify the tree**

```bash
rm -f client/harness.html client/src/harness.tsx
rm -f client/src/hooks/*.test.ts client/src/components/*.test.tsx client/src/components/app-shell/*.test.tsx client/src/components/dashboard/*.test.tsx
rm -rf client/node_modules/.tmp/dashboard-build
git status --short
git ls-files | grep -E '\.test\.|harness|__snapshots__' || echo "no test or harness files tracked"
```

Expected: `git status --short` prints nothing (clean) and the second command prints `no test or harness files tracked`. If anything else is listed, resolve it before reporting.

- [ ] **Step 7: Report**

Summarize faithfully: which checks passed, anything skipped (for example reduced-motion emulation, if the tool cannot do it), the commits on `page-revamp`, and that nothing was pushed. State plainly that the real fetch, create, rename, clone, delete, Edit and logout flows were not exercised against the live API (no sign-in possible here) and ask the user to click through them once; mention the loading toast and spinner on Edit and on the sidebar destinations are the things to look for on a slow connection.
