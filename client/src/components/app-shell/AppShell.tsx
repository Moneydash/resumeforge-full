import { useEffect, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, LogOut, Menu, X } from 'lucide-react';
import '@/styles/landing.css';
import '@/styles/dashboard.css';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutDialog from '@/components/LogoutDialog';
import { usePendingNavigation } from '@/hooks/usePendingNavigation';
import { useIsAdmin } from '@/admin/useIsAdmin';
import { ADMIN_NAV_ITEM, NAV_ITEMS, isActive } from './nav-items';

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
  const isAdmin = useIsAdmin();
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.to, item.activeFor);
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
