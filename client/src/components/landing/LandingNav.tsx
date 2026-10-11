import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { NAV_COPY, NAV_ITEMS } from './content';
import type { NavItem } from './content';

const MENU_ID = 'landing-mobile-menu';
const itemClass = 'l-navlink inline-flex min-h-11 items-center rounded-md px-2 text-[0.9375rem]';

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  const renderItem = (item: NavItem) =>
    'to' in item ? (
      <Link key={item.label} to={item.to} className={itemClass} onClick={close}>
        {item.label}
      </Link>
    ) : (
      <a key={item.label} href={item.href} className={itemClass} onClick={close}>
        {item.label}
      </a>
    );

  return (
    <header className="l-bg l-border sticky top-0 z-40 border-b">
      <a href="#main" className="l-skip">
        {NAV_COPY.skip}
      </a>
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="l-ink flex min-h-11 items-center gap-2.5 font-semibold no-underline">
          <img src="/icon.png" alt="" width={28} height={28} className="size-7 rounded-md" />
          {NAV_COPY.brand}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(renderItem)}
          <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
          <Link to="/login" className={itemClass}>
            {NAV_COPY.signIn}
          </Link>
          <Link to="/login" className="l-btn l-btn--primary ml-1">
            {NAV_COPY.cta}
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
          <button
            type="button"
            className="l-ink inline-flex min-h-11 min-w-11 items-center justify-center rounded-md"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={open ? NAV_COPY.closeMenu : NAV_COPY.openMenu}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id={MENU_ID} className="l-border l-bg border-t px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col">
            {NAV_ITEMS.map(renderItem)}
            <Link to="/login" className={itemClass} onClick={close}>
              {NAV_COPY.signIn}
            </Link>
            <Link to="/login" className="l-btn l-btn--primary mt-2" onClick={close}>
              {NAV_COPY.cta}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
