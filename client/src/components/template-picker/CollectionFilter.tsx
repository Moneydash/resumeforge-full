import { COLLECTIONS } from './collections';
import type { CollectionFilterId } from './collections';

interface CollectionFilterProps {
  selected: CollectionFilterId;
  counts: Record<CollectionFilterId, number>;
  onChange: (id: CollectionFilterId) => void;
}

const OPTIONS: { id: CollectionFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  ...COLLECTIONS.map((collection) => ({ id: collection.id, label: collection.filterLabel })),
];

export default function CollectionFilter({ selected, counts, onChange }: CollectionFilterProps) {
  return (
    <div className="app-seg" role="group" aria-label="Collection">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className="px-4 text-sm"
          aria-pressed={selected === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          <span className="tpl-count">{counts[option.id]}</span>
        </button>
      ))}
    </div>
  );
}
