import { Loader2 } from 'lucide-react';
import type { Template } from '@/types';
import { TEMPLATE_PREVIEWS } from './template-previews';

interface TemplateCardProps {
  template: Template;
  pending: boolean;
  onSelect: (id: string) => void;
}

export default function TemplateCard({ template, pending, onSelect }: TemplateCardProps) {
  const preview = TEMPLATE_PREVIEWS[template.id];

  return (
    <article className="app-card tpl-card">
      <div className="tpl-preview">
        {preview ? <img src={preview} alt="" width={560} height={700} loading="lazy" /> : 'No preview'}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="l-ink m-0 text-[0.9375rem] font-semibold">{template.name}</h3>
        <p className="l-muted m-0 text-xs">{template.category}</p>
        <p className="l-muted tpl-desc m-0 mb-3 text-[0.8125rem] leading-relaxed">{template.description}</p>
        <button
          type="button"
          className="l-btn l-btn--primary mt-auto w-full"
          aria-label={`Use ${template.name}`}
          aria-busy={pending || undefined}
          onClick={() => onSelect(template.id)}
        >
          {pending ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Opening...
            </>
          ) : (
            'Use this template'
          )}
        </button>
      </div>
    </article>
  );
}
