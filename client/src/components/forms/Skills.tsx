import type { ResumeFormData } from "@/types/interface.resume-form-data";
import { CirclePlusIcon, Trash2Icon, GripVerticalIcon, EyeOffIcon, EyeIcon } from "lucide-react";
import React, { useState } from "react";
import {
  useWatch,
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface SkillsFieldsComponentInterface {
  sectionDivClasses: string;
  sectionHeaderClasses: string;
  appendSkill: UseFieldArrayAppend<ResumeFormData>;
  addButtonClasses: string;
  skillsFields: FieldArrayWithId<ResumeFormData, "skills", "id">[];
  cardClasses: string;
  removeSkill: (index: number) => void;
  moveSkill: UseFieldArrayMove;
  removeButtonClasses: string;
  errors: FieldErrors<ResumeFormData>;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  inputClasses: string;
  watch: (name: string) => any;
  setValue: UseFormSetValue<ResumeFormData>;
  control: Control<ResumeFormData>;
}

interface SortableSkillCardProps {
  field: FieldArrayWithId<ResumeFormData, "skills", "id">;
  index: number;
  cardClasses: string;
  removeSkill: (index: number) => void;
  removeButtonClasses: string;
  inputClasses: string;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  errors: FieldErrors<ResumeFormData>;
  isEditing: boolean;
  setIsEditing: (index: number, editing: boolean) => void;
  watch: (name: string) => any;
  onSave: () => void;
  setValue: UseFormSetValue<ResumeFormData>;
  control: Control<ResumeFormData>;
}

const SortableSkillCard: React.FC<SortableSkillCardProps> = ({
  field,
  index,
  cardClasses,
  removeSkill,
  removeButtonClasses,
  inputClasses,
  register,
  labelClasses,
  errors,
  isEditing,
  setIsEditing,
  watch,
  onSave,
  setValue,
  control
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
    name: `skills.${index}.hidden`
  });

  const handleToggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(`skills.${index}.hidden`, !isHidden);
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className={`${cardClasses} cursor-default`}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Skill #{index + 1}
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
              onClick={() => removeSkill(index)}
              className={removeButtonClasses}
            >
              <Trash2Icon size={15} style={{ marginRight: 5, marginBottom: 1 }} /> Remove
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className={labelClasses}>Skill *</Label>
            <Input
              {...register(`skills.${index}.name`)}
              className={inputClasses}
              placeholder="Programming Language"
            />
            {errors.skills?.[index]?.name && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.skills[index]?.name?.message}
              </p>
            )}
          </div>
          <div>
            <Label className={labelClasses}>Keywords</Label>
            <Input
              {...register(`skills.${index}.keywords`)}
              className={inputClasses}
              placeholder="PHP, Java, Javascript(separate with commas)"
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
        filter: isHidden ? "grayscale(0.7)" : undefined
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
            {watch(`skills.${index}.name`) || "Skill"}
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
                  removeSkill(index);
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
      <div className="flex flex-wrap gap-2">
        {(() => {
          const keywords = watch(`skills.${index}.keywords`);
          let keywordArr: string[] = [];
          if (typeof keywords === 'string') {
            keywordArr = keywords.split(',').map(kw => kw.trim()).filter(Boolean);
          } else if (Array.isArray(keywords)) {
            keywordArr = keywords.map(kw => String(kw).trim()).filter(Boolean);
          }
          if (keywordArr.length === 0) return <span className="text-gray-400">No keywords</span>;
          return keywordArr.map((kw, i) => (
            <span
              key={i}
              className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-200"
            >
              {kw}
            </span>
          ));
        })()}
      </div>
    </div>
  );
};

const SkillsFieldsComponent: React.FC<SkillsFieldsComponentInterface> = ({
  sectionDivClasses,
  sectionHeaderClasses,
  appendSkill,
  addButtonClasses,
  skillsFields,
  cardClasses,
  removeSkill,
  moveSkill,
  removeButtonClasses,
  errors,
  register,
  labelClasses,
  inputClasses,
  watch,
  setValue,
  control
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
      const oldIndex = skillsFields.findIndex(field => field.id === active.id);
      const newIndex = skillsFields.findIndex(field => field.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveSkill(oldIndex, newIndex);
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
          <h2 className={sectionHeaderClasses}>Skills</h2>
          <button
            type="button"
            onClick={() => appendSkill({ name: '', keywords: [] })}
            className={addButtonClasses}
          >
            <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Skill
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={skillsFields.map(field => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {skillsFields.map((field, index) => (
                <SortableSkillCard
                  key={field.id}
                  field={field}
                  index={index}
                  cardClasses={cardClasses}
                  removeSkill={removeSkill}
                  removeButtonClasses={removeButtonClasses}
                  inputClasses={inputClasses}
                  register={register}
                  labelClasses={labelClasses}
                  errors={errors}
                  isEditing={editingIndex === index}
                  setIsEditing={setIsEditing}
                  watch={watch}
                  onSave={() => forceUpdate((n: number) => n + 1)}
                  setValue={setValue}
                  control={control}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
};

export default React.memo(SkillsFieldsComponent);