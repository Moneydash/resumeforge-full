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
