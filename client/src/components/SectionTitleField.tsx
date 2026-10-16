import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { TemplateType } from '@/types';
import { SECTION_LABELS, type BuiltInSectionId } from '@/utils/section-layout';
import { MAX_TITLE_LENGTH, getDefaultTitle, setSectionTitle, type SectionTitles } from '@/utils/section-titles';

interface SectionTitleFieldProps {
  id: BuiltInSectionId;
  template: TemplateType;
  titles: SectionTitles | undefined;
  onChange: (next: SectionTitles | undefined) => void;
}

/** Rename one section's heading on the resume; the placeholder is what the current template prints by default. */
const SectionTitleField: React.FC<SectionTitleFieldProps> = ({ id, template, titles, onChange }) => {
  const stored = titles?.[id] ?? '';
  // typing keeps the raw text (a trailing space must survive); only the saved name is trimmed
  const [draft, setDraft] = useState(stored);
  useEffect(() => { setDraft((current) => (current.trim() === stored ? current : stored)); }, [stored]);

  return (
    <div className="flex items-center gap-1">
      <Input
        value={draft}
        maxLength={MAX_TITLE_LENGTH}
        placeholder={getDefaultTitle(template, id) ?? SECTION_LABELS[id]}
        aria-label={`Resume heading for ${SECTION_LABELS[id]}`}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(setSectionTitle(titles, id, event.target.value));
        }}
        className="h-8 text-sm"
      />
      <button
        type="button"
        disabled={!stored}
        aria-label={`Reset ${SECTION_LABELS[id]} heading to default`}
        title="Reset to the template's heading"
        onClick={() => onChange(setSectionTitle(titles, id, undefined))}
        className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-gray-700"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
};

export default SectionTitleField;
