import { ArrowLeft, ListTree, OctagonAlert, Scale, ShieldAlert } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export type Block =
  | { kind: 'p'; text: React.ReactNode }
  | { kind: 'list'; items: React.ReactNode[] }
  | { kind: 'defs'; items: [term: string, meaning: string][] }
  | { kind: 'callout'; icon: 'rules' | 'warranty' | 'liability'; title: string; text?: string; items?: string[]; caps?: boolean }
  | { kind: 'contact' };

export interface LegalSection {
  id: string;
  title: string;
  blocks: Block[];
}

interface LegalDocumentProps {
  /** Page h1, e.g. "Terms of Service". */
  title: string;
  /** Human-readable and ISO (YYYY-MM-DD) forms of the last-updated date. */
  updated: { label: string; iso: string };
  intro: React.ReactNode;
  sections: LegalSection[];
}

const CALLOUT_ICONS = { rules: OctagonAlert, warranty: ShieldAlert, liability: Scale } as const;

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm';

const BlockView: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.kind) {
    case 'p':
      return <p>{block.text}</p>;

    case 'list':
      return (
        <ul className="list-disc space-y-2 pl-6 marker:text-muted-foreground">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case 'defs':
      return (
        <dl className="divide-y divide-border border-y border-border">
          {block.items.map(([term, meaning]) => (
            <div key={term} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="font-semibold text-foreground">&ldquo;{term}&rdquo;</dt>
              <dd className="m-0">{meaning}</dd>
            </div>
          ))}
        </dl>
      );

    case 'callout': {
      const Icon = CALLOUT_ICONS[block.icon];
      return (
        <aside className="rounded-md border border-border border-l-[3px] border-l-foreground/70 bg-muted/50 px-5 py-4">
          <p className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {block.title}
          </p>
          {block.text && (
            <p className={block.caps ? 'font-sans text-[0.8125rem] leading-6 tracking-wide' : undefined}>
              {block.text}
            </p>
          )}
          {block.items && (
            <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </aside>
      );
    }

    case 'contact':
      return (
        <dl className="grid gap-x-6 gap-y-2 border-y border-border py-4 sm:grid-cols-[6rem_1fr]">
          <dt className="font-semibold text-foreground">Email</dt>
          <dd className="m-0">
            <a
              href="mailto:crraquid@gmail.com"
              className={`text-primary underline underline-offset-4 hover:text-primary/80 ${focusRing}`}
            >
              crraquid@gmail.com
            </a>
          </dd>
          <dt className="font-semibold text-foreground">Address</dt>
          <dd className="m-0">BGC Taguig, Philippines</dd>
        </dl>
      );
  }
};

const LegalDocument: React.FC<LegalDocumentProps> = ({ title, updated, intro, sections }) => {
  const [activeId, setActiveId] = useState(sections[0].id);
  // Section the user just clicked; held until they scroll manually.
  const pinnedId = useRef<string | null>(null);

  // Highlight the last section whose top has passed the reading line. Near the
  // bottom of the page the final (short) sections can never reach that line,
  // so fall back to the last section there.
  useEffect(() => {
    const update = () => {
      if (pinnedId.current) return;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActiveId(sections[sections.length - 1].id);
        return;
      }
      let current = sections[0].id;
      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      setActiveId(current);
    };
    const release = () => {
      pinnedId.current = null;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchmove', release, { passive: true });
    window.addEventListener('keydown', release);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchmove', release);
      window.removeEventListener('keydown', release);
    };
  }, [sections]);

  const closeDisclosure = (e: React.MouseEvent<HTMLElement>) =>
    e.currentTarget.closest('details')?.removeAttribute('open');

  const tocLinks = (onNavigate?: (e: React.MouseEvent<HTMLElement>) => void) =>
    sections.map((section, i) => {
      const active = section.id === activeId;
      return (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            onClick={(e) => {
              pinnedId.current = section.id;
              setActiveId(section.id);
              onNavigate?.(e);
            }}
            aria-current={active ? 'location' : undefined}
            className={`flex min-h-9 items-baseline gap-3 border-l-2 py-1.5 pl-3 pr-2 text-sm leading-snug transition-colors duration-150 ${focusRing} ${
              active
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-5 shrink-0 tabular-nums text-xs">{String(i + 1).padStart(2, '0')}</span>
            <span>{section.title}</span>
          </a>
        </li>
      );
    });

  return (
    <div className="min-h-screen bg-background text-foreground [scroll-behavior:smooth] motion-reduce:[scroll-behavior:auto]">
      <a
        href="#legal-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-12">
          <Link
            to="/login"
            className={`-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground ${focusRing}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to login
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="px-4 pb-24 pt-12 sm:px-6 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-14 lg:px-12 lg:pt-16">
        {/* Table of contents */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <details className="group mb-10 rounded-md border border-border lg:hidden">
            <summary
              className={`flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium ${focusRing}`}
            >
              <ListTree className="size-4" aria-hidden="true" />
              Jump to section
            </summary>
            <nav aria-label={`${title} sections`} className="border-t border-border py-2">
              <ul>{tocLinks(closeDisclosure)}</ul>
            </nav>
          </details>

          <nav aria-label={`${title} sections`} className="hidden lg:block">
            <p className="mb-3 pl-3 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Contents
            </p>
            <ul className="max-h-[calc(100vh-8rem-3.5rem)] overflow-y-auto">{tocLinks()}</ul>
          </nav>
        </aside>

        {/* Document */}
        <main id="legal-content" className="min-w-0">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            ResumeForge &middot; Legal
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated <time dateTime={updated.iso}>{updated.label}</time>
          </p>
          <p className="mt-8 max-w-3xl border-y border-border py-6 text-[1.0625rem] leading-8 text-foreground">
            {intro}
          </p>

          <div className="mt-4">
            {sections.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="scroll-mt-20 border-b border-border py-10 last:border-b-0 xl:grid xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-12"
              >
                <h2
                  id={`${section.id}-title`}
                  className="mb-5 flex items-baseline gap-4 text-2xl font-semibold leading-snug xl:sticky xl:top-24 xl:mb-0 xl:self-start"
                >
                  <span className="font-sans text-sm font-normal tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {section.title}
                </h2>
                <div className="max-w-3xl space-y-4 text-[1.0625rem] leading-8 text-foreground/85 2xl:text-lg 2xl:leading-9">
                  {section.blocks.map((block, j) => (
                    <BlockView key={j} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-6 border-t border-border pt-6 text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ResumeForge. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
};

export default LegalDocument;
