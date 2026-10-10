import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TemplateType } from '@/types';
import type { ResumeFormData } from '@/types/interface.resume-form-data';
import {
  SECTION_LABELS,
  getColumnLabels,
  getPinned,
  hasContent,
  normalizeLayout,
  resolveLayout,
  type SectionId,
  type SectionLayout,
} from '@/utils/section-layout';

interface SectionOrderPanelProps {
  template: TemplateType;
  data: ResumeFormData;
  layout: SectionLayout | undefined;
  isDarkMode: boolean;
  onChange: (layout: SectionLayout | undefined) => void;
  onClose: () => void;
}

const columnDroppableId = (index: number) => `column-${index}`;

const SortableRow: React.FC<{ id: SectionId; pinned: boolean; empty: boolean }> = ({ id, pinned, empty }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: pinned });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`flex items-center gap-2 rounded-md border px-2 py-2 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${empty ? 'opacity-60' : ''}`}
    >
      {pinned ? (
        <Lock size={14} className="text-gray-400" aria-label="Fixed section" />
      ) : (
        <button type="button" className="cursor-grab touch-none text-gray-500" aria-label={`Move ${SECTION_LABELS[id]}`} {...attributes} {...listeners}>
          <GripVertical size={16} />
        </button>
      )}
      <span className="flex-1">{SECTION_LABELS[id]}</span>
      {empty && <span className="text-xs text-gray-400">empty</span>}
    </div>
  );
};

const Column: React.FC<{ index: number; label: string; ids: SectionId[]; pinned: SectionId[]; data: ResumeFormData; showLabel: boolean }> = ({
  index, label, ids, pinned, data, showLabel,
}) => {
  const { setNodeRef } = useDroppable({ id: columnDroppableId(index) });
  return (
    <div className="flex-1 min-w-0">
      {showLabel && <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2 rounded-md border border-dashed border-gray-300 p-2 dark:border-gray-600">
          {ids.map((id) => (
            <SortableRow key={id} id={id} pinned={pinned.includes(id)} empty={!hasContent(id, data)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

const SectionOrderPanel: React.FC<SectionOrderPanelProps> = ({ template, data, layout, isDarkMode, onChange, onClose }) => {
  const resolved = useMemo(() => resolveLayout(template, layout, data), [template, layout, data]);
  const resolvedKey = JSON.stringify(resolved);
  const [items, setItems] = useState<SectionId[][]>(resolved);
  const dragStartRef = useRef<SectionId[][]>(resolved); // board as it was when the drag began
  const pinned = getPinned(template);
  const labels = getColumnLabels(template);

  // pick up outside changes (template switch, reset, data load)
  useEffect(() => { setItems(resolved); }, [resolvedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumn = (id: string): number => {
    if (id.startsWith('column-')) return Number(id.slice('column-'.length));
    return items.findIndex((column) => column.includes(id as SectionId));
  };

  const handleDragStart = () => {
    dragStartRef.current = items;
  };

  // Escape or a drop outside the board: forget the mid-drag cross-column move
  const handleDragCancel = () => {
    setItems(dragStartRef.current);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (from === -1 || to === -1 || from === to) return;
    setItems((prev) => {
      const moving = active.id as SectionId;
      const target = prev[to];
      const overIndex = target.indexOf(over.id as SectionId);
      const insertAt = overIndex === -1 ? target.length : overIndex;
      return prev.map((column, c) => {
        if (c === from) return column.filter((id) => id !== moving);
        if (c === to) return [...target.slice(0, insertAt), moving, ...target.slice(insertAt)];
        return column;
      });
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) {
      handleDragCancel();
      return;
    }
    let next = items;
    if (over) {
      const column = findColumn(String(active.id));
      if (column !== -1 && column === findColumn(String(over.id)) && active.id !== over.id) {
        const from = items[column].indexOf(active.id as SectionId);
        const to = items[column].indexOf(over.id as SectionId);
        if (to !== -1) {
          next = items.map((ids, c) => (c === column ? arrayMove(ids, from, to) : ids));
        }
      }
    }
    const normalized = normalizeLayout(template, next, data);
    setItems(normalized.columns);
    if (JSON.stringify(normalized.columns) !== resolvedKey) onChange(normalized);
  };

  return (
    <aside
      className={`flex h-full w-80 shrink-0 flex-col border-l shadow-xl ${isDarkMode ? 'bg-gray-800/95 border-gray-700/50' : 'bg-white/95 border-gray-200/50'}`}
      aria-label="Section order"
    >
      <div className="flex items-center justify-between border-b border-gray-200/50 p-4 dark:border-gray-700/50">
        <h2 className="text-lg font-semibold">Section order</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close section order">
          <X size={16} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <p className="mb-4 text-xs text-gray-500">
          Drag sections to reorder them. Locked sections and the header stay where the template puts them.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <div className="flex gap-3">
            {items.map((ids, index) => (
              <Column key={index} index={index} label={labels[index]} ids={ids} pinned={pinned} data={data} showLabel={items.length > 1} />
            ))}
          </div>
        </DndContext>
      </div>
      <div className="border-t border-gray-200/50 p-4 dark:border-gray-700/50">
        <Button variant="outline" className="w-full" onClick={() => onChange(undefined)} disabled={!layout}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to default
        </Button>
      </div>
    </aside>
  );
};

export default SectionOrderPanel;
