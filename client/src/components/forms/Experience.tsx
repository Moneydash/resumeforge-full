import type { ResumeFormData } from "@/types/interface.resume-form-data";
import { CirclePlusIcon, Trash2Icon, GripVerticalIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import React, { useState } from "react";
import {
  Controller,
  type Control,
  type FieldArrayWithId,
  type FieldErrors,
  type UseFieldArrayAppend,
  type UseFieldArrayMove,
  type UseFormRegister,
  type UseFormSetValue,
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import MonthPicker from "../MonthPicker";
import EditorComponent from "../EditorComponent";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useWatch } from "react-hook-form";
import { SectionBody, SectionHeader, type SectionControls } from "./SectionHeader";

interface ExperienceFieldsComponentInterface {
  controls: SectionControls;
  appendExperience: UseFieldArrayAppend<ResumeFormData>;
  addButtonClasses: string;
  experienceFields: FieldArrayWithId<ResumeFormData, "experience", "id">[];
  cardClasses: string;
  removeExperience: (index: number) => void;
  moveExperience: UseFieldArrayMove;
  removeButtonClasses: string;
  inputClasses: string;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  errors: FieldErrors<ResumeFormData>;
  control: Control<ResumeFormData>;
  watch: (name: string) => any;
  setValue: UseFormSetValue<ResumeFormData>;
}

interface SortableExperienceCardProps {
  field: FieldArrayWithId<ResumeFormData, "experience", "id">;
  index: number;
  cardClasses: string;
  removeExperience: (index: number) => void;
  removeButtonClasses: string;
  inputClasses: string;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  errors: FieldErrors<ResumeFormData>;
  control: Control<ResumeFormData>;
  isEditing: boolean;
  setIsEditing: (index: number, editing: boolean) => void;
  onSave: () => void;
  watch: (name: string) => any;
  setValue: UseFormSetValue<ResumeFormData>;
}

const SortableExperienceCard: React.FC<SortableExperienceCardProps> = ({
  field,
  index,
  cardClasses,
  removeExperience,
  removeButtonClasses,
  inputClasses,
  register,
  labelClasses,
  errors,
  control,
  isEditing,
  setIsEditing,
  watch,
  onSave,
  setValue
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCardClick = () => {
    if (!isEditing) {
      setIsEditing(index, true);
    }
  };

  const handleSave = () => {
    setIsEditing(index, false);
    onSave(); // onSave should trigger forceUpdate in the parent
  };

  const handleCancel = () => {
    setIsEditing(index, false);
  };

  const isHidden = useWatch({
    control,
    name: `experience.${index}.hidden`
  });

  const handleToggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(`experience.${index}.hidden`, !isHidden);
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className={`${cardClasses} cursor-default`}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Experience #{index + 1}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-md min-h-9 pointer-coarse:min-h-11 bg-[#111110] text-white hover:bg-[#2a2a28] dark:bg-[#f4f4f2] dark:text-[#111110] dark:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff] focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c] transition-colors duration-150"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-md min-h-9 pointer-coarse:min-h-11 border border-[#cfcdc5] dark:border-white/25 bg-white dark:bg-transparent text-[#111110] dark:text-[#f4f4f2] hover:bg-[#f6f5f2] dark:hover:bg-[#151517] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff] focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c] transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => removeExperience(index)}
              className={removeButtonClasses}
            >
              <Trash2Icon size={15} style={{ marginRight: 5, marginBottom: 1 }} /> Remove
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className={labelClasses}>Job Title *</Label>
            <Input
              {...register(`experience.${index}.title`)}
              className={inputClasses}
              placeholder="Software Engineer"
            />
            {errors.experience?.[index]?.title && (
              <p className="text-[#b3261e] dark:text-[#ff8a80] text-sm mt-1 flex items-start gap-1.5 before:content-[''] before:mt-[0.45em] before:size-1.5 before:shrink-0 before:rounded-full before:bg-current">
                {errors.experience[index]?.title?.message}
              </p>
            )}
          </div>

          <div>
            <Label className={labelClasses}>Company *</Label>
            <Input
              {...register(`experience.${index}.company`)}
              className={inputClasses}
              placeholder="Company Name"
            />
            {errors.experience?.[index]?.company && (
              <p className="text-[#b3261e] dark:text-[#ff8a80] text-sm mt-1 flex items-start gap-1.5 before:content-[''] before:mt-[0.45em] before:size-1.5 before:shrink-0 before:rounded-full before:bg-current">
                {errors.experience[index]?.company?.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClasses}>Start Date *</label>
            <Controller
              control={control}
              name={`experience.${index}.startDate`}
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
            {errors.experience?.[index]?.startDate && (
              <p className="text-[#b3261e] dark:text-[#ff8a80] text-sm mt-1 flex items-start gap-1.5 before:content-[''] before:mt-[0.45em] before:size-1.5 before:shrink-0 before:rounded-full before:bg-current">
                {errors.experience[index]?.startDate?.message}
              </p>
            )}
          </div>

          <div>
            <label className={labelClasses}>End Date</label>
            <Controller
              control={control}
              name={`experience.${index}.endDate`}
              render={({ field }) => (
                <MonthPicker
                  value={field.value}
                  setValue={field.onChange}
                  monthPlaceholder="Select Month"
                  yearPlaceholder="Select Year"
                  monthRequired={false}
                  yearRequired={false}
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className={labelClasses}>Description</label>
          <Controller
            control={control}
            name={`experience.${index}.description`}
            render={({ field }) => (
              <EditorComponent
                value={field.value}
                setValue={field.onChange}
              />
            )}
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
      style={{
        ...style,
        opacity: isHidden ? 0.5 : 1,
        filter: isHidden ? "grayscale(0.7)" : undefined,
      }}
      className={`${cardClasses} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <GripVerticalIcon size={16} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {watch(`experience.${index}.title`) || "Job Title"}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleToggleHidden}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={isHidden ? "Show on resume" : "Hide from resume"}
          >
            {isHidden ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeExperience(index);
                }}
                className={removeButtonClasses}
              >
                <Trash2Icon size={15} style={{ marginBottom: 1 }} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="dark:text-white">Remove</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-md text-gray-600 dark:text-gray-300">
          {watch(`experience.${index}.company`) || "Company Name"}
        </div>
      </div>
    </div>
  );
};

const ExperienceFieldsComponent: React.FC<ExperienceFieldsComponentInterface> = ({
  controls,
  appendExperience,
  addButtonClasses,
  experienceFields,
  cardClasses,
  removeExperience,
  moveExperience,
  inputClasses,
  removeButtonClasses,
  register,
  labelClasses,
  errors,
  control,
  watch,
  setValue
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [, forceUpdate] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = experienceFields.findIndex(field => field.id === active.id);
      const newIndex = experienceFields.findIndex(field => field.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        moveExperience(oldIndex, newIndex);
      }
    }
  };

  const setIsEditing = (index: number, editing: boolean) => {
    setEditingIndex(editing ? index : null);
  };

  return (
    <>
      <div className="space-y-4">
        <SectionHeader
          title="Experience"
          controls={controls}
          actions={
            <button
              type="button"
              onClick={() => appendExperience({ title: '', company: '', startDate: '', endDate: '', description: '', hidden: false })}
              className={addButtonClasses}
            >
              <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Experience
            </button>
          }
        />
        <SectionBody collapsed={controls.collapsed} hidden={controls.hidden}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={experienceFields.map(field => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {experienceFields.map((field, index) => (
                  <SortableExperienceCard
                    key={field.id}
                    field={field}
                    index={index}
                    cardClasses={cardClasses}
                    removeExperience={removeExperience}
                    removeButtonClasses={removeButtonClasses}
                    inputClasses={inputClasses}
                    register={register}
                    labelClasses={labelClasses}
                    errors={errors}
                    control={control}
                    isEditing={editingIndex === index}
                    setIsEditing={setIsEditing}
                    onSave={() => forceUpdate((n: number) => n + 1)}
                    watch={watch}
                    setValue={setValue}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </SectionBody>
      </div>
    </>
  );
};

export default React.memo(ExperienceFieldsComponent);