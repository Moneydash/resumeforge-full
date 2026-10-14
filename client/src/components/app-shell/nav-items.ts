import { FileText, Mail, ScanText, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  key: 'resumes' | 'letters' | 'ats' | 'admin';
  label: string;
  to: string;
  icon: LucideIcon;
  pendingMessage: string;
  /** Other routes that belong to this section, so the item stays marked current there. */
  activeFor?: readonly string[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'resumes', label: 'Resumes', to: '/dashboard', icon: FileText, pendingMessage: 'Opening resumes...', activeFor: ['/templates'] },
  { key: 'letters', label: 'Cover letters', to: '/cl-dashboard', icon: Mail, pendingMessage: 'Opening cover letters...', activeFor: ['/cl-templates'] },
  { key: 'ats', label: 'ATS scanner', to: '/ats-scanner', icon: ScanText, pendingMessage: 'Opening the ATS scanner...' },
];

/** Shown below the others, to admins only (see useIsAdmin). */
export const ADMIN_NAV_ITEM: NavItem = {
  key: 'admin',
  label: 'Admin',
  to: '/admin',
  icon: ShieldCheck,
  pendingMessage: 'Opening the admin page...',
};

export const isActive = (pathname: string, to: string, activeFor: readonly string[] = []) =>
  [to, ...activeFor].some((route) => pathname === route || pathname.startsWith(`${route}/`));
