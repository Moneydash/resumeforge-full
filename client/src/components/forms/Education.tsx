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
  useWatch,
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import MonthPicker from "../MonthPicker";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface EducationFieldsComponentInterface {
  sectionDivClasses: string;
  sectionHeaderClasses: string;
  appendEducation: UseFieldArrayAppend<ResumeFormData>;
  addButtonClasses: string;
  educationFields: FieldArrayWithId<ResumeFormData, "education", "id">[];
  cardClasses: string;
  removeEducation: (index: number) => void;
  moveEducation: UseFieldArrayMove;
  removeButtonClasses: string;
  errors: FieldErrors<ResumeFormData>;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  inputClasses: string;
  control: Control<ResumeFormData>;
  watch: (name: string) => any;
  setValue: UseFormSetValue<ResumeFormData>;
}

interface SortableEducationCardProps {
  field: FieldArrayWithId<ResumeFormData, "education", "id">;
  index: number;
  cardClasses: string;
  removeEducation: (index: number) => void;
  removeButtonClasses: string;
  inputClasses: string;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  errors: FieldErrors<ResumeFormData>;
  control: Control<ResumeFormData>;
  isEditing: boolean;
  setIsEditing: (index: number, editing: boolean) => void;
  watch: (name: string) => any;
  onSave: () => void;
  setValue: UseFormSetValue<ResumeFormData>;
}

const SortableEducationCard: React.FC<SortableEducationCardProps> = ({
  field,
  index,
  cardClasses,
  removeEducation,
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
    onSave();
  };

  const handleCancel = () => {
    setIsEditing(index, false);
  };

  const isHidden = useWatch({
    control,
    name: `education.${index}.hidden`
  });

  const handleToggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(`education.${index}.hidden`, !isHidden);
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className={`${cardClasses} cursor-default`}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Education #{index + 1}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 text-sm text-white rounded bg-blue-500"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => removeEducation(index)}
              className={removeButtonClasses}
            >
              <Trash2Icon size={15} style={{ marginRight: 5, marginBottom: 1 }} /> Remove
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className={labelClasses}>Degree *</Label>
            <Input
              {...register(`education.${index}.degree`)}
              className={inputClasses}
              placeholder="Bachelor of Science in Computer Science"
            />
            {errors.education?.[index]?.degree && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.education[index]?.degree?.message}
              </p>
            )}
          </div>
          <div>
            <Label className={labelClasses}>Institution *</Label>
            <Input
              {...register(`education.${index}.institution`)}
              className={inputClasses}
              placeholder="University Name"
            />
            {errors.education?.[index]?.institution && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.education[index]?.institution?.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className={labelClasses}>Start Date *</Label>
            <Controller
              name={`education.${index}.startDate`}
              control={control}
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
            {errors.education?.[index]?.startDate && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.education[index]?.startDate?.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClasses}>End Date</label>
            <Controller
              name={`education.${index}.endDate`}
              control={control}
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
            {watch(`education.${index}.degree`) || "Degree"}
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
                  removeEducation(index);
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
          {watch(`education.${index}.institution`) || "Institution"}
        </div>
      </div>
    </div>
  );
};

const EducationFieldsComponent: React.FC<EducationFieldsComponentInterface> = ({
  sectionDivClasses,
  sectionHeaderClasses,
  appendEducation,
  addButtonClasses,
  educationFields,
  cardClasses,
  removeEducation,
  moveEducation,
  removeButtonClasses,
  errors,
  register,
  labelClasses,
  inputClasses,
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
      const oldIndex = educationFields.findIndex(field => field.id === active.id);
      const newIndex = educationFields.findIndex(field => field.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveEducation(oldIndex, newIndex);
      }
    }
  };

  const setIsEditing = (index: number, editing: boolean) => {
    setEditingIndex(editing ? index : null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className={`${sectionDivClasses} flex justify-between items-center`}>
          <h2 className={sectionHeaderClasses}>Education</h2>
          <button
            type="button"
            onClick={() => appendEducation({ degree: '', institution: '', startDate: '', endDate: '', hidden: false })}
            className={addButtonClasses}
          >
            <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Education
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={educationFields.map(field => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {educationFields.map((field, index) => (
                <SortableEducationCard
                  key={field.id}
                  field={field}
                  index={index}
                  cardClasses={cardClasses}
                  removeEducation={removeEducation}
                  removeButtonClasses={removeButtonClasses}
                  inputClasses={inputClasses}
                  register={register}
                  labelClasses={labelClasses}
                  errors={errors}
                  control={control}
                  isEditing={editingIndex === index}
                  setIsEditing={setIsEditing}
                  watch={watch}
                  onSave={() => forceUpdate((n: number) => n + 1)}
                  setValue={setValue}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
};

export default React.memo(EducationFieldsComponent);