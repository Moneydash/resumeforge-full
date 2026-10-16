import type { ResumeFormData } from "@/types/interface.resume-form-data";
import { CirclePlusIcon, Trash2Icon, GripVerticalIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import React, { useState } from "react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormTrigger,
} from "react-hook-form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import MonthPicker from "../MonthPicker";
import EditorComponent from "../EditorComponent";
import { SectionBody, SectionHeader, type SectionControls } from "./SectionHeader";
import { customSectionId, formatEntryDate, newCustomSection, type CustomSectionEntry } from "@/utils/custom-sections";
import { MAX_TITLE_LENGTH } from "@/utils/section-titles";
import type { SectionId } from "@/utils/section-layout";

const errorClasses = "text-[#b3261e] dark:text-[#ff8a80] text-sm mt-1 flex items-start gap-1.5 before:content-[''] before:mt-[0.45em] before:size-1.5 before:shrink-0 before:rounded-full before:bg-current";
const secondaryButtonClasses = "inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-md min-h-9 pointer-coarse:min-h-11 border border-[#cfcdc5] dark:border-white/25 bg-white dark:bg-transparent text-[#111110] dark:text-[#f4f4f2] hover:bg-[#f6f5f2] dark:hover:bg-[#151517] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff] focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c] transition-colors duration-150";

const NEW_ENTRY: CustomSectionEntry = {
  title: '', description: '', startDate: '', hasEndDate: false, stillOngoing: false, endDate: '', hidden: false,
};

interface Shared {
  control: Control<ResumeFormData>;
  register: UseFormRegister<ResumeFormData>;
  errors: FieldErrors<ResumeFormData>;
  setValue: UseFormSetValue<ResumeFormData>;
  trigger: UseFormTrigger<ResumeFormData>;
  cardClasses: string;
  inputClasses: string;
  labelClasses: string;
  addButtonClasses: string;
  removeButtonClasses: string;
}

/** On/off switch (no shadcn Switch in this project). */
const Toggle: React.FC<{ checked: boolean; onChange: (next: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <div className="flex items-center gap-2 text-sm text-[#5c5b56] dark:text-[#a3a29c]">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff] ${checked ? 'bg-[#111110] dark:bg-[#f4f4f2]' : 'bg-[#cfcdc5] dark:bg-white/25'}`}
    >
      <span className={`inline-block size-4 rounded-full bg-white dark:bg-[#111110] shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
    <span aria-hidden="true">{label}</span>
  </div>
);

interface EntryCardProps extends Shared {
  sectionIndex: number;
  index: number;
  fieldId: string;
  isEditing: boolean;
  setEditing: (editing: boolean) => void;
  onClose: () => Promise<void>;
  onRemove: () => void;
}

const EntryCard: React.FC<EntryCardProps> = ({
  control, register, errors, setValue, cardClasses, inputClasses, labelClasses, removeButtonClasses,
  sectionIndex, index, fieldId, isEditing, setEditing, onClose, onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fieldId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const base = `customSections.${sectionIndex}.entries.${index}` as const;
  const entry = useWatch({ control, name: base });
  const entryErrors = errors.customSections?.[sectionIndex]?.entries?.[index];

  const setHasEndDate = (next: boolean) => {
    setValue(`${base}.hasEndDate`, next, { shouldDirty: true });
    if (!next) {
      setValue(`${base}.stillOngoing`, false, { shouldDirty: true });
      setValue(`${base}.endDate`, '', { shouldDirty: true });
    }
  };
  const setStillOngoing = (next: boolean) => {
    setValue(`${base}.stillOngoing`, next, { shouldDirty: true });
    if (next) setValue(`${base}.endDate`, '', { shouldDirty: true });
  };
  const toggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(`${base}.hidden`, !entry?.hidden, { shouldDirty: true });
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className={`${cardClasses} cursor-default`}>
        <div className="flex flex-wrap justify-between items-start gap-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Entry #{index + 1}</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className={secondaryButtonClasses}>Close</button>
            <button type="button" onClick={onRemove} className={removeButtonClasses}>
              <Trash2Icon size={15} style={{ marginRight: 5, marginBottom: 1 }} /> Remove
            </button>
          </div>
        </div>

        <div>
          <Label className={labelClasses}>Title *</Label>
          <Input {...register(`${base}.title`)} className={inputClasses} placeholder="Food bank volunteer" />
          {entryErrors?.title && <p className={errorClasses}>{entryErrors.title.message}</p>}
        </div>

        <div className="grid grid-cols-1 @md:grid-cols-2 gap-5">
          <div>
            <label className={labelClasses}>Start Date *</label>
            <Controller
              control={control}
              name={`${base}.startDate`}
              render={({ field }) => (
                <MonthPicker
                  value={field.value}
                  setValue={field.onChange}
                  monthPlaceholder="Select Month"
                  yearPlaceholder="Select Year"
                  monthRequired={true}
                  yearRequired={true}
                />
              )}
            />
            {entryErrors?.startDate && <p className={errorClasses}>{entryErrors.startDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Toggle checked={!!entry?.hasEndDate} onChange={setHasEndDate} label="Has an end date" />
            {entry?.hasEndDate && (
              <>
                <label className="flex items-center gap-2 text-sm text-[#5c5b56] dark:text-[#a3a29c] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!entry?.stillOngoing}
                    onChange={(e) => setStillOngoing(e.target.checked)}
                    className="size-4 accent-[#111110] dark:accent-[#f4f4f2]"
                  />
                  Still ongoing
                </label>
                {!entry?.stillOngoing && (
                  <div>
                    <label className={labelClasses}>End Date *</label>
                    <Controller
                      control={control}
                      name={`${base}.endDate`}
                      render={({ field }) => (
                        <MonthPicker
                          value={field.value ?? ''}
                          setValue={field.onChange}
                          monthPlaceholder="Select Month"
                          yearPlaceholder="Select Year"
                          monthRequired={true}
                          yearRequired={true}
                        />
                      )}
                    />
                    {entryErrors?.endDate && <p className={errorClasses}>{entryErrors.endDate.message}</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <label className={labelClasses}>Description</label>
          <Controller
            control={control}
            name={`${base}.description`}
            render={({ field }) => <EditorComponent value={field.value} setValue={field.onChange} />}
          />
          <p className="text-xs text-[#5c5b56] dark:text-[#a3a29c] mt-1 ml-1">
            Press Enter for new lines. These will be preserved when generating your resume.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: entry?.hidden ? 0.5 : 1, filter: entry?.hidden ? "grayscale(0.7)" : undefined }}
      className={`${cardClasses} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => setEditing(true)}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <GripVerticalIcon size={16} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{entry?.title || "Entry title"}</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleHidden}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={entry?.hidden ? "Show on resume" : "Hide from resume"}
          >
            {entry?.hidden ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className={removeButtonClasses} aria-label="Remove entry">
            <Trash2Icon size={15} style={{ marginBottom: 1 }} />
          </button>
        </div>
      </div>
      {entry?.startDate && (
        <div className="mt-4 text-md text-gray-600 dark:text-gray-300">{formatEntryDate(entry as CustomSectionEntry)}</div>
      )}
    </div>
  );
};

interface BlockProps extends Shared {
  index: number;
  sectionId: string;
  controls: SectionControls;
  onRemoveSection: () => void;
}

const CustomSectionBlock: React.FC<BlockProps> = (props) => {
  const { index, sectionId, controls, onRemoveSection, control, register, errors, trigger, labelClasses, inputClasses, addButtonClasses, removeButtonClasses } = props;
  const name = useWatch({ control, name: `customSections.${index}.title` });
  const { fields, append, remove, move } = useFieldArray({ control, name: `customSections.${index}.entries` });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const validate = (entryIndex: number) =>
    trigger(`customSections.${index}.entries.${entryIndex}` as `customSections.${number}.entries.${number}`);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.id === active.id);
    const to = fields.findIndex((field) => field.id === over.id);
    if (from !== -1 && to !== -1) {
      move(from, to);
      setEditingIndex(null);
    }
  };

  // Finish the open entry first so a half-filled one is not left behind, then open the new entry
  const handleAdd = async () => {
    if (editingIndex !== null && !(await validate(editingIndex))) return;
    append(NEW_ENTRY);
    setEditingIndex(fields.length);
  };

  return (
    <div className="space-y-4" data-section-id={customSectionId(sectionId)}>
      <SectionHeader
        title={name?.trim() || 'Custom Section'}
        controls={controls}
        actions={
          <button type="button" onClick={handleAdd} className={addButtonClasses}>
            <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Entry
          </button>
        }
      />
      <SectionBody collapsed={controls.collapsed} hidden={controls.hidden}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <Label className={labelClasses}>Section Name *</Label>
            <Input
              {...register(`customSections.${index}.title`)}
              maxLength={MAX_TITLE_LENGTH}
              className={inputClasses}
              placeholder="Volunteer Work"
            />
            {errors.customSections?.[index]?.title && <p className={errorClasses}>{errors.customSections[index]?.title?.message}</p>}
          </div>
          <button type="button" onClick={onRemoveSection} className={removeButtonClasses}>
            <Trash2Icon size={15} style={{ marginRight: 5, marginBottom: 1 }} /> Remove Section
          </button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {fields.map((field, entryIndex) => (
                <EntryCard
                  key={field.id}
                  {...props}
                  sectionIndex={index}
                  index={entryIndex}
                  fieldId={field.id}
                  isEditing={editingIndex === entryIndex}
                  setEditing={(editing) => setEditingIndex(editing ? entryIndex : null)}
                  onClose={async () => { if (await validate(entryIndex)) setEditingIndex(null); }}
                  onRemove={() => { remove(entryIndex); setEditingIndex(null); }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </SectionBody>
    </div>
  );
};

interface CustomSectionsProps extends Shared {
  sections: Array<{ id: string }>;
  controlsFor: (id: SectionId) => SectionControls;
  appendSection: (section: ReturnType<typeof newCustomSection>) => void;
  removeSection: (index: number) => void;
}

const CustomSectionsComponent: React.FC<CustomSectionsProps> = ({ sections, controlsFor, appendSection, removeSection, ...shared }) => (
  <div className="space-y-8">
    {sections.map((section, index) => (
      <CustomSectionBlock
        key={section.id}
        {...shared}
        index={index}
        sectionId={section.id}
        controls={controlsFor(customSectionId(section.id))}
        onRemoveSection={() => removeSection(index)}
      />
    ))}
    <button type="button" onClick={() => appendSection(newCustomSection())} className={shared.addButtonClasses}>
      <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Custom Section
    </button>
  </div>
);

export default CustomSectionsComponent;
