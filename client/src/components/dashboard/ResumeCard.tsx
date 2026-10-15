import { Loader2 } from 'lucide-react';
import type { ResumeSummary } from '@/types';
import { TEMPLATE_THUMBS } from '@/utils/template-thumbs';
import { formatDateDisplay, formatTemplateName } from '@/utils/helper';
import ResumeActionsMenu from './ResumeActionsMenu';
import type { ResumeHandlers } from './types';

interface ResumeCardProps extends ResumeHandlers {
  resume: ResumeSummary;
  pending: boolean;
}

export default function ResumeCard({ resume, pending, onEdit, onClone, onRename, onShare, onDelete }: ResumeCardProps) {
  const name = resume.resume_name || 'Untitled';
  const thumb = resume.template ? TEMPLATE_THUMBS[resume.template] : undefined;

  return (
    <article className="app-card flex h-full flex-col">
      <div className={thumb ? 'app-thumb' : 'app-thumb app-thumb--empty'}>
        {thumb ? <img src={thumb} alt="" width={280} height={373} loading="lazy" /> : 'No template yet'}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="min-w-0">
          <h2 className="l-ink m-0 break-words text-[0.9375rem] font-semibold">{name}</h2>
          <p className="l-muted m-0 mt-1 break-words text-[0.8125rem]">
            {resume.template ? formatTemplateName(resume.template) : 'No template'} · {formatDateDisplay(resume.updated_at)}
          </p>
        </div>
        <div className="mt-auto flex items-center gap-2">
          <button
            type="button"
            className="l-btn l-btn--primary flex-1"
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
            onShare={onShare ? () => onShare(resume) : undefined}
            onDelete={() => onDelete(resume.id)}
          />
        </div>
      </div>
    </article>
  );
}
