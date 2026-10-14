import { FileIcon, LayoutDashboard, Loader2, Palette } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import '@/styles/landing.css';
import '@/styles/editor-chrome.css';
import { liveStatusLabel, statusTone } from './status';
import type { LiveStatus } from './status';

export interface EditorTopBarProps {
  templateLabel: string;
  status: LiveStatus;
  designOpen: boolean;
  canOpenDesign: boolean;
  onToggleDesign: () => void;
  onDashboard: () => void;
  onExport: () => void;
  exporting: boolean;
  canExport: boolean;
  exportHint?: string;
}

export default function EditorTopBar({
  templateLabel,
  status,
  designOpen,
  canOpenDesign,
  onToggleDesign,
  onDashboard,
  onExport,
  exporting,
  canExport,
  exportHint,
}: EditorTopBarProps) {
  const label = liveStatusLabel(status);
  const tone = statusTone(status);

  return (
    <header className="ec-topbar">
      <div className="ec-topbar__left">
        <div className="ec-brand">
          <img src="/icon.png" alt="" width={22} height={22} />
          ResumeForge
        </div>
        <span className="ec-sep hidden md:block" aria-hidden="true" />
        <span className="l-eyebrow l-muted ec-template hidden md:inline">{templateLabel}</span>
        <div className="ec-status hidden sm:inline-flex" role="status" aria-live="polite" data-tone={tone}>
          {label && (
            <>
              {status === 'updating' ? (
                <Loader2 aria-hidden="true" className="size-3 animate-spin" />
              ) : (
                <span className="ec-dot" data-tone={tone} aria-hidden="true" />
              )}
              {label}
            </>
          )}
        </div>
      </div>

      <div className="ec-topbar__right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="ec-iconbtn"
                aria-label="Design"
                aria-pressed={designOpen}
                disabled={!canOpenDesign}
                onClick={onToggleDesign}
              >
                <Palette aria-hidden="true" className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Design</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <button type="button" className="l-btn l-btn--ghost" aria-label="Dashboard" onClick={onDashboard}>
          <LayoutDashboard aria-hidden="true" className="size-4" />
          <span className="hidden md:inline">Dashboard</span>
        </button>

        <button
          type="button"
          id="exportButton"
          className="l-btn l-btn--primary"
          aria-label={exporting ? 'Exporting' : 'Export PDF'}
          disabled={exporting || !canExport}
          title={exportHint}
          onClick={onExport}
        >
          {exporting ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              <span className="hidden md:inline">Exporting...</span>
            </>
          ) : (
            <>
              <FileIcon aria-hidden="true" className="size-4" />
              <span className="hidden md:inline">Export PDF</span>
            </>
          )}
        </button>

        <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
      </div>
    </header>
  );
}
