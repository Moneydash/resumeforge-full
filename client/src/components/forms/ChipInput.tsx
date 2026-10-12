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
    <div className="mt-1 flex min-h-10 pointer-coarse:min-h-11 w-full flex-wrap items-center gap-2 rounded-md border border-[#e5e3dc] bg-white px-3 py-2 transition-colors duration-150 hover:border-[#cfcdc5] focus-within:border-[#111110] focus-within:ring-2 focus-within:ring-[#1f3f8f] focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-white/12 dark:bg-[#0b0b0c] dark:hover:border-white/25 dark:focus-within:border-[#f4f4f2] dark:focus-within:ring-[#8fb0ff] dark:focus-within:ring-offset-[#0b0b0c]">
      {chips.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          className="inline-flex items-center gap-1 rounded-md border border-[#e5e3dc] bg-[#f6f5f2] py-0.5 pl-3 pr-1 text-sm text-[#111110] dark:border-white/12 dark:bg-[#151517] dark:text-[#f4f4f2]"
        >
          {chip}
          <button
            type="button"
            aria-label={`Remove ${chip}`}
            onMouseDown={(event) => event.preventDefault()} // keep focus so pending text is not committed mid-click
            onClick={() => onChange(removeChip(chips, index))}
            className="rounded p-0.5 hover:bg-[#e5e3dc] dark:hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]"
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
        className="min-w-32 flex-1 bg-transparent text-sm text-[#111110] outline-none placeholder:text-[#6f6e69] dark:text-[#f4f4f2] dark:placeholder:text-[#8f8e88]"
      />
    </div>
  );
};

export default ChipInput;
