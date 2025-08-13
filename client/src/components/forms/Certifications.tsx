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
  type UseFormSetValue,
  type UseFormWatch
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

interface CertificationFieldsComponentInterface {
  sectionDivClasses: string;
  sectionHeaderClasses: string;
  appendCertification: UseFieldArrayAppend<ResumeFormData>;
  addButtonClasses: string;
  certificationFields: FieldArrayWithId<ResumeFormData, "certifications", "id">[];
  cardClasses: string;
  removeCertification: (index: number) => void;
  moveCertification: UseFieldArrayMove;
  removeButtonClasses: string;
  errors: FieldErrors<ResumeFormData>;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  inputClasses: string;
  watch: UseFormWatch<ResumeFormData>;
  setValue: UseFormSetValue<ResumeFormData>;
  control: Control<ResumeFormData>;
}

interface SortableCertificationCardProps {
  field: FieldArrayWithId<ResumeFormData, "certifications", "id">;
  index: number;
  cardClasses: string;
  removeCertification: (index: number) => void;
  removeButtonClasses: string;
  inputClasses: string;
  register: UseFormRegister<ResumeFormData>;
  labelClasses: string;
  errors: FieldErrors<ResumeFormData>;
  isEditing: boolean;
  setIsEditing: (index: number, editing: boolean) => void;
  watch: UseFormWatch<ResumeFormData>;
  setValue: UseFormSetValue<ResumeFormData>;
  onSave: () => void;
  control: Control<ResumeFormData>;
}

const SortableCertificationCard: React.FC<SortableCertificationCardProps> = ({
  field,
  index,
  cardClasses,
  removeCertification,
  removeButtonClasses,
  inputClasses,
  register,
  labelClasses,
  errors,
  isEditing,
  setIsEditing,
  watch,
  setValue,
  onSave,
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
    name: `certifications.${index}.hidden`
  });

  const handleToggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(`certifications.${index}.hidden`, !isHidden);
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className={`${cardClasses} cursor-default`}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Certification #{index + 1}
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
              onClick={() => removeCertification(index)}
              className={removeButtonClasses}
            >
              <Trash2Icon size={15} style={{ marginRight: 5, marginBottom: 1 }} /> Remove
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className={labelClasses}>Certification Name *</Label>
            <Input
              {...register(`certifications.${index}.name`)}
              className={inputClasses}
              placeholder="AWS Certified Solutions Architect"
            />
            {errors.certifications?.[index]?.name && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.certifications[index]?.name?.message}
              </p>
            )}
          </div>
          <div>
            <Label className={labelClasses}>Issuing Organization *</Label>
            <Input
              {...register(`certifications.${index}.issuingOrganization`)}
              className={inputClasses}
              placeholder="Amazon Web Services"
            />
            {errors.certifications?.[index]?.issuingOrganization && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.certifications[index]?.issuingOrganization?.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClasses}>Date Obtained *</label>
            <MonthPicker
              value={watch('certifications')[index].date}
              setValue={newValue => setValue(`certifications.${index}.date`, newValue)}
              monthPlaceholder="Select Month"
              yearPlaceholder="Select Year"
              monthRequired={true}
              yearRequired={true}
            />
            {errors.certifications?.[index]?.date && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.certifications[index]?.date?.message}
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
              const name = watch(`certifications.${index}.name`);
              if (!name) return "Certification Name";
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
              removeCertification(index);
            }}
            className={removeButtonClasses}
            title="Remove"
          >
            <Trash2Icon size={15} style={{ marginBottom: 1 }} />
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="text-md text-gray-600 dark:text-gray-300">
          {watch(`certifications.${index}.issuingOrganization`) || "Organization"}
        </div>
      </div>
    </div>
  );
};

const CertificationFieldsComponent: React.FC<CertificationFieldsComponentInterface> = ({
  sectionDivClasses,
  sectionHeaderClasses,
  appendCertification,
  addButtonClasses,
  certificationFields,
  cardClasses,
  removeCertification,
  moveCertification,
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
      const oldIndex = certificationFields.findIndex(field => field.id === active.id);
      const newIndex = certificationFields.findIndex(field => field.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveCertification(oldIndex, newIndex);
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
          <h2 className={sectionHeaderClasses}>Certifications</h2>
          <button
            type="button"
            onClick={() => appendCertification({ name: '', issuingOrganization: '', date: '' })}
            className={addButtonClasses}
          >
            <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Certification
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={certificationFields.map(field => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {certificationFields.map((field, index) => (
                <SortableCertificationCard
                  key={field.id}
                  field={field}
                  index={index}
                  cardClasses={cardClasses}
                  removeCertification={removeCertification}
                  removeButtonClasses={removeButtonClasses}
                  inputClasses={inputClasses}
                  register={register}
                  labelClasses={labelClasses}
                  errors={errors}
                  isEditing={editingIndex === index}
                  setIsEditing={setIsEditing}
                  watch={watch}
                  setValue={setValue}
                  onSave={() => forceUpdate(n => n + 1)}
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

export default CertificationFieldsComponent;