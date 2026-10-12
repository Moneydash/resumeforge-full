import type { ReactNode } from 'react';
import TemplateCard from './TemplateCard';
import type { TemplateGroup } from './collections';

interface TemplatePickerProps {
  title: string;
  subtitle: string;
  /** Optional control shown at the right of the header (the resume page's collection filter). */
  filter?: ReactNode;
  groups: TemplateGroup[];
  /** When off, each group's heading is kept for screen readers only (a single group needs no visible heading). */
  showGroupHeadings?: boolean;
  pendingId: string | null;
  onSelectTemplate: (id: string) => void;
}

export default function TemplatePicker({
  title,
  subtitle,
  filter,
  groups,
  showGroupHeadings = true,
  pendingId,
  onSelectTemplate,
}: TemplatePickerProps) {
  return (
    <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="app-title m-0">{title}</h1>
          <p className="l-muted m-0 mt-1 text-sm">{subtitle}</p>
        </div>
        {filter}
      </div>

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`collection-${group.id}`} className="tpl-group">
          {showGroupHeadings ? (
            <div className="tpl-group-head">
              <h2 id={`collection-${group.id}`} className="l-eyebrow l-muted m-0">
                {group.heading}
              </h2>
              <span className="l-muted text-sm">{`${group.templates.length} templates`}</span>
            </div>
          ) : (
            <h2 id={`collection-${group.id}`} className="sr-only">
              {group.heading}
            </h2>
          )}
          <ul className="tpl-grid">
            {group.templates.map((template) => (
              <li key={template.id}>
                <TemplateCard template={template} pending={pendingId === template.id} onSelect={onSelectTemplate} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
