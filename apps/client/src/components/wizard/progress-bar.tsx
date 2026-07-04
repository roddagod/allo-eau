import { CheckIcon } from '@/components/icons';

export type WizardStep = { id: string; label: string };

/**
 * Barre de progression réutilisable pour les parcours multi-étapes.
 * S'affiche horizontalement, s'adapte au mobile en masquant les labels.
 */
export function ProgressBar({
  steps,
  currentIdx,
}: {
  steps: ReadonlyArray<WizardStep>;
  currentIdx: number;
}) {
  return (
    <ol className="flex items-center gap-1">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isLast = i === steps.length - 1;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-1">
            <span
              className={
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ' +
                (done || active
                  ? 'bg-primary text-white'
                  : 'border-2 border-surface-border bg-white text-ink-subtle')
              }
              aria-hidden
            >
              {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={
                'hidden text-xs font-medium sm:inline ' +
                (active ? 'text-ink' : 'text-ink-subtle')
              }
            >
              {s.label}
            </span>
            {!isLast && (
              <span
                className={'h-0.5 flex-1 ' + (done ? 'bg-primary' : 'bg-surface-border')}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function StepHeader({
  index,
  total,
  title,
  description,
}: {
  index: number;
  total: number;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Étape {index} sur {total}
      </p>
      <h2 className="mt-1 text-xl font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
    </div>
  );
}
