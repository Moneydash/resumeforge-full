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
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ProjectFieldsComponentInterface {
  sectionDivClasses: string;
  sectionHeaderClasses: string;
  appendProject: UseFieldArrayAppend<ResumeFormData>;
  addButtonClasses: string;
  projectFields: FieldArrayWithId<ResumeFormData, "projects", "id">[];
  cardClasses: string;
  removeProject: (index: number) => void;
  moveProject: UseFieldArrayMove;
  removeButtonClasses: string;
  errors: FieldErrors<ResumeFormData>;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  inputClasses: string;
  watch: (name: string) => any;
  setValue: UseFormSetValue<ResumeFormData>;
  control: Control<ResumeFormData>;
}

interface SortableProjectCardProps {
  field: FieldArrayWithId<ResumeFormData, "projects", "id">;
  index: number;
  cardClasses: string;
  removeProject: (index: number) => void;
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

const SortableProjectCard: React.FC<SortableProjectCardProps> = ({
  field,
  index,
  cardClasses,
  removeProject,
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
    name: `projects.${index}.hidden`
  });

  const handleToggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(`projects.${index}.hidden`, !isHidden);
  }

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className={`${cardClasses} cursor-default`}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Project #{index + 1}
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
              onClick={() => removeProject(index)}
              className={removeButtonClasses}
            >
              <Trash2Icon size={15} style={{ marginRight: 5, marginBottom: 1 }} /> Remove
            </button>
          </div>
        </div>
        <div>
          <Label className={labelClasses}>Project Title *</Label>
          <Input
            {...register(`projects.${index}.title`)}
            className={inputClasses}
            placeholder="E-commerce Platform"
          />
          {errors.projects?.[index]?.title && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {errors.projects[index]?.title?.message}
            </p>
          )}
        </div>
        <div>
          <Label className={labelClasses}>Description</Label>
          <Textarea
            {...register(`projects.${index}.description`)}
            rows={3}
            className={inputClasses}
            placeholder="Describe the project, your role, and key achievements..."
          />
        </div>
        <div>
          <Label className={labelClasses}>Technologies Used</Label>
          <Input
            {...register(`projects.${index}.technologies`)}
            className={inputClasses}
            placeholder="React, Node.js, MongoDB (separate with commas)"
          />
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
            {watch(`projects.${index}.title`) || "Project Title"}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleToggleHidden}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={isHidden ? 'Show on resume' : 'Hide from resume'}
          >
            {isHidden ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject(index);
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
          {(() => {
            const desc = watch(`projects.${index}.description`);
            if (!desc) return "Description";
            return desc.length > 50 ? desc.slice(0, 50) + "…" : desc;
          })()}
        </div>
      </div>
    </div>
  );
};

const ProjectFieldsComponent: React.FC<ProjectFieldsComponentInterface> = ({
  sectionDivClasses,
  sectionHeaderClasses,
  appendProject,
  addButtonClasses,
  projectFields,
  cardClasses,
  removeProject,
  moveProject,
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
      const oldIndex = projectFields.findIndex(field => field.id === active.id);
      const newIndex = projectFields.findIndex(field => field.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveProject(oldIndex, newIndex);
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
          <h2 className={sectionHeaderClasses}>Projects</h2>
          <button
            type="button"
            onClick={() => appendProject({ title: '', description: '', technologies: [] })}
            className={addButtonClasses}
          >
            <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Project
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={projectFields.map(field => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {projectFields.map((field, index) => (
                <SortableProjectCard
                  key={field.id}
                  field={field}
                  index={index}
                  cardClasses={cardClasses}
                  removeProject={removeProject}
                  removeButtonClasses={removeButtonClasses}
                  inputClasses={inputClasses}
                  register={register}
                  labelClasses={labelClasses}
                  errors={errors}
                  isEditing={editingIndex === index}
                  setIsEditing={setIsEditing}
                  watch={watch}
                  onSave={() => forceUpdate(n => n + 1)}
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

export default React.memo(ProjectFieldsComponent);