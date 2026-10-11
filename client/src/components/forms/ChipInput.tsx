import React, { useState } from "react";
import { X } from "lucide-react";
import { addChips, removeChip, takeChips, toChips } from "@/utils/chips";

interface ChipInputProps {
  id: string;
  /** Saved list; older resumes may hold comma separated text. */
  value: unknown;
  onChange: (chips: string[]) => void;
  placeholder?: string;
}

/** Type a value and press Enter or a comma to turn it into a chip; Backspace on an empty field removes the last one. */
const ChipInput: React.FC<ChipInputProps> = ({ id, value, onChange, placeholder }) => {
  const chips = toChips(value);
  const [draft, setDraft] = useState('');

  const commitDraft = () => {
    if (draft.trim()) onChange(addChips(chips, draft));
    setDraft('');
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = takeChips(chips, event.target.value);
    if (next.chips !== chips) onChange(next.chips);
    setDraft(next.draft);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Enter makes a chip, it must not submit the resume form
      commitDraft();
    } else if (event.key === 'Backspace' && draft === '' && chips.length) {
      onChange(removeChip(chips, chips.length - 1));
    }
  };

  return (
    <div className="mt-1 flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition-colors duration-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700">
      {chips.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-100 py-0.5 pl-3 pr-1 text-sm text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100"
        >
          {chip}
          <button
            type="button"
            aria-label={`Remove ${chip}`}
            onMouseDown={(event) => event.preventDefault()} // keep focus so pending text is not committed mid-click
            onClick={() => onChange(removeChip(chips, index))}
            className="rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={chips.length ? undefined : placeholder}
        className="min-w-32 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-500 dark:text-white dark:placeholder-gray-400"
      />
    </div>
  );
};

export default ChipInput;
