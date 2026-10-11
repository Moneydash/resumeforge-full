import type { Template } from '@/types';
import CollectionFilter from './CollectionFilter';
import TemplatePicker from './TemplatePicker';
import { filterCounts, groupTemplates } from './collections';
import type { CollectionFilterId } from './collections';

interface TemplatesViewProps {
  templates: Template[];
  selected: CollectionFilterId;
  onSelectedChange: (id: CollectionFilterId) => void;
  pendingId: string | null;
  onSelectTemplate: (id: string) => void;
}

// The resume templates page: the shared picker layout plus the Galaxy / Greek collection filter.
export default function TemplatesView({ templates, selected, onSelectedChange, pendingId, onSelectTemplate }: TemplatesViewProps) {
  return (
    <TemplatePicker
      title="Choose a template"
      subtitle="Pick a layout for your resume. You can change the template later from the editor."
      filter={<CollectionFilter selected={selected} counts={filterCounts(templates)} onChange={onSelectedChange} />}
      groups={groupTemplates(templates, selected)}
      pendingId={pendingId}
      onSelectTemplate={onSelectTemplate}
    />
  );
}
