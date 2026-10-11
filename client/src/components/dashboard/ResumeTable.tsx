import { Loader2 } from 'lucide-react';
import type { ResumeSummary } from '@/types';
import { TEMPLATE_THUMBS } from '@/utils/template-thumbs';
import { formatDateDisplay, formatTemplateName } from '@/utils/helper';
import ResumeActionsMenu from './ResumeActionsMenu';
import { RESUME_LABELS } from './labels';
import type { DocLabels, ResumeHandlers } from './types';

interface ResumeTableProps extends ResumeHandlers {
  resumes: ResumeSummary[];
  pendingEditId: string | null;
  labels?: DocLabels;
}

export default function ResumeTable({ resumes, pendingEditId, onEdit, onClone, onRename, onDelete, labels = RESUME_LABELS }: ResumeTableProps) {
  return (
    <table className="app-table">
      <caption className="sr-only">{labels.tableCaption}</caption>
      <thead>
        <tr>
          <th scope="col" className="w-16">
            <span className="sr-only">Preview</span>
          </th>
          <th scope="col">Name</th>
          <th scope="col" className="hidden md:table-cell">Template</th>
          <th scope="col" className="hidden md:table-cell">Last edited</th>
          <th scope="col">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {resumes.map((resume) => {
          const name = resume.resume_name || 'Untitled';
          const thumb = resume.template ? TEMPLATE_THUMBS[resume.template] : undefined;
          const template = resume.template ? formatTemplateName(resume.template) : 'No template';
          const date = formatDateDisplay(resume.updated_at);
          const pending = pendingEditId === resume.id;
          return (
            <tr key={resume.id}>
              <td>
                {thumb ? (
                  <img src={thumb} alt="" width={36} height={48} loading="lazy" className="app-card h-12 w-9 object-cover object-top" />
                ) : (
                  <div aria-hidden="true" className="l-border h-12 w-9 rounded-sm border border-dashed" />
                )}
              </td>
              <td className="min-w-0">
                <div className="l-ink break-words font-semibold">{name}</div>
                <div className="l-muted break-all font-mono text-xs">{resume.resume_slug_name}</div>
                <div className="l-muted mt-1 text-[0.8125rem] md:hidden">
                  {template} · {date}
                </div>
              </td>
              <td className="l-muted hidden md:table-cell">{template}</td>
              <td className="l-muted hidden md:table-cell">{date}</td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="l-btn l-btn--primary"
                    aria-label={`Edit ${name}`}
                    aria-busy={pending || undefined}
                    onClick={() => onEdit(resume)}
                  >
                    {pending ? (
                      <>
                        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      'Edit'
                    )}
                  </button>
                  <ResumeActionsMenu
                    name={name}
                    onClone={() => onClone(resume.id)}
                    onRename={() => onRename(resume)}
                    onDelete={() => onDelete(resume.id)}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
