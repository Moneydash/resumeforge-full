import type { ResumeFormData } from "@/types/interface.resume-form-data";
import { CirclePlusIcon, Trash2Icon, GripVerticalIcon, EyeOff, Eye } from "lucide-react";
import React, { useState } from "react";
import {
  useWatch,
  type Control,
  type FieldArrayWithId,
  type FieldErrors,
  type UseFieldArrayAppend,
  type UseFieldArrayMove,
  type UseFormRegister,
  type UseFormSetValue
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

interface ReferencesFieldsComponentInterface {
  sectionDivClasses: string;
  sectionHeaderClasses: string;
  appendReference: UseFieldArrayAppend<ResumeFormData>;
  addButtonClasses: string;
  referenceFields: FieldArrayWithId<ResumeFormData, "references", "id">[];
  cardClasses: string;
  removeReference: (index: number) => void;
  moveReference: UseFieldArrayMove;
  removeButtonClasses: string;
  errors: FieldErrors<ResumeFormData>;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  inputClasses: string;
  watch: (name: string) => any;
  setValue: UseFormSetValue<ResumeFormData>;
  control: Control<ResumeFormData>;
}

interface SortableReferenceCardProps {
  field: FieldArrayWithId<ResumeFormData, "references", "id">;
  index: number;
  cardClasses: string;
  removeReference: (index: number) => void;
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

const SortableReferenceCard: React.FC<SortableReferenceCardProps> = ({
  field,
  index,
  cardClasses,
  removeReference,
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
    name: `references.${index}.hidden`
  });

  const handleToggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(`references.${index}.hidden`, !isHidden);
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className={`${cardClasses} cursor-default`}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Reference #{index + 1}
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
              onClick={() => removeReference(index)}
              className={removeButtonClasses}
            >
              <Trash2Icon size={15} style={{ marginRight: 5, marginBottom: 1 }} /> Remove
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <Label className={labelClasses}>Full Name *</Label>
            <Input
              {...register(`references.${index}.name`)}
              className={inputClasses}
              placeholder="John Doe"
            />
            {errors.references?.[index]?.name && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.references[index]?.name?.message}
              </p>
            )}
          </div>
          <div>
            <Label className={labelClasses}>Job Title *</Label>
            <Input
              {...register(`references.${index}.title`)}
              className={inputClasses}
              placeholder="Senior Manager"
            />
            {errors.references?.[index]?.title && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.references[index]?.title?.message}
              </p>
            )}
          </div>
        </div>
        <div>
          <Label className={labelClasses}>Company *</Label>
          <Input
            {...register(`references.${index}.company`)}
            className={inputClasses}
            placeholder="Company Name"
          />
          {errors.references?.[index]?.company && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {errors.references[index]?.company?.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <Label className={labelClasses}>Email *</Label>
            <Input
              type="email"
              {...register(`references.${index}.email`)}
              className={inputClasses}
              placeholder="john.doe@company.com"
            />
            {errors.references?.[index]?.email && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.references[index]?.email?.message}
              </p>
            )}
          </div>
          <div>
            <Label className={labelClasses}>Phone *</Label>
            <Input
              type="tel"
              {...register(`references.${index}.phone`)}
              className={inputClasses}
              placeholder="+1-234-567-8900"
            />
            {errors.references?.[index]?.phone && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.references[index]?.phone?.message}
              </p>
            )}
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
            {(() => {
              const name = watch(`references.${index}.name`);
              if (!name) return "Full Name";
              return name.length > 50 ? name.slice(0, 50) + "…" : name;
            })()}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleToggleHidden}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={isHidden ? "Show on resume" : "Hide from resume"}
          >
            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeReference(index);
            }}
            className={removeButtonClasses}
          >
            <Trash2Icon size={15} style={{ marginBottom: 1 }} />
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="text-md text-gray-600 dark:text-gray-300">
          {watch(`references.${index}.title`) || "Job Title"}
        </div>
        <div className="text-md text-gray-600 dark:text-gray-300">
          {watch(`references.${index}.company`) || "Company"}
        </div>
      </div>
    </div>
  );
};

const ReferencesFieldsComponent: React.FC<ReferencesFieldsComponentInterface> = ({
  sectionDivClasses,
  sectionHeaderClasses,
  appendReference,
  addButtonClasses,
  referenceFields,
  cardClasses,
  removeReference,
  moveReference,
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
      const oldIndex = referenceFields.findIndex(field => field.id === active.id);
      const newIndex = referenceFields.findIndex(field => field.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveReference(oldIndex, newIndex);
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
          <h2 className={sectionHeaderClasses}>References</h2>
          <button
            type="button"
            onClick={() => appendReference({ name: '', title: '', company: '', email: '', phone: '' })}
            className={addButtonClasses}
          >
            <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Reference
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={referenceFields.map(field => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {referenceFields.map((field, index) => (
                <SortableReferenceCard
                  key={field.id}
                  field={field}
                  index={index}
                  cardClasses={cardClasses}
                  removeReference={removeReference}
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

export default React.memo(ReferencesFieldsComponent);