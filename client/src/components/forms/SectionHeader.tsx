import React from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { sectionDivClasses, sectionHeaderClasses } from "@/styles/form-classes";

/** What every section form needs to show its two toggles; supplied by ResumeForm. */
export interface SectionControls {
  /** Parent toggle is off: the whole section is left out of the resume. */
  hidden: boolean;
  /** Form-only view state: the section's fields are folded away. */
  collapsed: boolean;
  onToggleHidden: () => void;
  onToggleCollapsed: () => void;
}

interface SectionHeaderProps {
  title: string;
  controls: SectionControls;
  /** Buttons that belong to the section itself, e.g. "Add Award". */
  actions?: React.ReactNode;
}

const iconButtonClasses = "inline-flex items-center justify-center size-[34px] pointer-coarse:size-11 rounded-md text-[#5c5b56] dark:text-[#a3a29c] hover:bg-[#f6f5f2] dark:hover:bg-[#151517] hover:text-[#111110] dark:hover:text-[#f4f4f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]";

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, controls, actions }) => {
  const { hidden, collapsed, onToggleHidden, onToggleCollapsed } = controls;
  return (
    <div className={`${sectionDivClasses} flex justify-between items-center gap-2`}>
      <div className="flex items-center gap-1 min-w-0">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
          title={collapsed ? 'Expand section' : 'Collapse section'}
          className={iconButtonClasses}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </button>
        <h2 className={`${sectionHeaderClasses} ${hidden ? 'opacity-50' : ''}`}>{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {!collapsed && actions}
        <button
          type="button"
          onClick={onToggleHidden}
          aria-pressed={hidden}
          aria-label={hidden ? `Show ${title} on resume` : `Hide ${title} from resume`}
          title={hidden ? 'Show section on resume' : 'Hide section from resume'}
          className={`${iconButtonClasses} mb-1.5`}
        >
          {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

/** Content stays mounted while collapsed so react-hook-form keeps its inputs and errors. */
export const SectionBody: React.FC<{ collapsed: boolean; hidden?: boolean; className?: string; children: React.ReactNode }> = ({
  collapsed, hidden = false, className = '', children,
}) => (
  <div hidden={collapsed} className={`${hidden ? 'opacity-50' : ''} ${className}`.trim() || undefined}>
    {children}
  </div>
);
