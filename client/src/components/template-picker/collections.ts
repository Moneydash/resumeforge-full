import type { Template } from '@/types';

export type CollectionFilterId = 'all' | 'galaxy' | 'greek';

export const COLLECTIONS = [
  { id: 'galaxy', filterLabel: 'Galaxy', heading: 'Galaxy collection' },
  { id: 'greek', filterLabel: 'Greek', heading: 'Greek Gods collection' },
] as const;

export interface TemplateGroup {
  id: string;
  heading: string;
  templates: Template[];
}

/** The collections to show for the current filter, in a fixed order, keeping data order; empty ones are dropped. */
export function groupTemplates(templates: Template[], selected: CollectionFilterId): TemplateGroup[] {
  return COLLECTIONS.filter((collection) => selected === 'all' || selected === collection.id)
    .map((collection) => ({
      id: collection.id,
      heading: collection.heading,
      templates: templates.filter((template) => template.theme === collection.id),
    }))
    .filter((group) => group.templates.length > 0);
}

export function filterCounts(templates: Template[]): Record<CollectionFilterId, number> {
  return {
    all: templates.length,
    galaxy: templates.filter((template) => template.theme === 'galaxy').length,
    greek: templates.filter((template) => template.theme === 'greek').length,
  };
}
