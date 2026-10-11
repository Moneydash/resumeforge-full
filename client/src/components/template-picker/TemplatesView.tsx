import type { Template } from '@/types';
import CollectionFilter from './CollectionFilter';
import TemplateCard from './TemplateCard';
import { filterCounts, groupTemplates } from './collections';
import type { CollectionFilterId } from './collections';

interface TemplatesViewProps {
  templates: Template[];
  selected: CollectionFilterId;
  onSelectedChange: (id: CollectionFilterId) => void;
  pendingId: string | null;
  onSelectTemplate: (id: string) => void;
}

export default function TemplatesView({ templates, selected, onSelectedChange, pendingId, onSelectTemplate }: TemplatesViewProps) {
  const groups = groupTemplates(templates, selected);

  return (
    <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="app-title m-0">Choose a template</h1>
          <p className="l-muted m-0 mt-1 text-sm">
            Pick a layout for your resume. You can change the template later from the editor.
          </p>
        </div>
        <CollectionFilter selected={selected} counts={filterCounts(templates)} onChange={onSelectedChange} />
      </div>

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`collection-${group.id}`} className="tpl-group">
          <div className="tpl-group-head">
            <h2 id={`collection-${group.id}`} className="l-eyebrow l-muted m-0">
              {group.heading}
            </h2>
            <span className="l-muted text-sm">{`${group.templates.length} templates`}</span>
          </div>
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
