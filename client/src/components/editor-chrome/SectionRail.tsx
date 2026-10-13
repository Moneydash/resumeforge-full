import type { ComponentType, RefObject } from 'react';
import '@/styles/landing.css';
import '@/styles/editor-chrome.css';

export interface RailItem {
  icon: ComponentType<{ size?: number }>;
  label: string;
  ref: RefObject<HTMLDivElement>;
}

interface SectionRailProps {
  items: RailItem[];
  /** Accessible name of the rail; the resume editor keeps the default. */
  label?: string;
  onSelect: (ref: RefObject<HTMLDivElement>) => void;
}

// The page passes its own sidebarItems and scrollToSection, so the scrolling behavior is unchanged.
export default function SectionRail({ items, label = 'Resume sections', onSelect }: SectionRailProps) {
  return (
    <nav className="ec-rail" aria-label={label}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="ec-rail__item">
            <button type="button" className="ec-rail__btn" aria-label={item.label} onClick={() => onSelect(item.ref)}>
              <Icon size={16} />
            </button>
            <span className="ec-rail__tip" aria-hidden="true">
              {item.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
