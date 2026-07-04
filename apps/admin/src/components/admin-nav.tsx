import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { signOutAction } from '@/lib/auth-actions';
import type { CurrentUser } from '@eaupourtous/db';

type NavItem = { href: string; label: string };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  super_admin: [
    { href: '/',             label: 'Tableau de bord' },
    { href: '/commandes',    label: 'Commandes' },
    { href: '/societes',     label: 'Sociétés' },
    { href: '/tarifs',       label: 'Tarifs' },
    { href: '/utilisateurs', label: 'Utilisateurs' },
    { href: '/audit',        label: 'Audit' },
  ],
  admin: [
    { href: '/',          label: 'Tableau de bord' },
    { href: '/commandes', label: 'Commandes' },
    { href: '/societes',  label: 'Sociétés' },
    { href: '/tarifs',    label: 'Tarifs' },
  ],
  supervisor: [
    { href: '/',          label: 'Tableau de bord' },
    { href: '/commandes', label: 'Commandes' },
    { href: '/incidents', label: 'Incidents' },
  ],
  company_owner: [
    { href: '/',           label: 'Tableau de bord' },
    { href: '/commandes',  label: 'Commandes' },
    { href: '/livreurs',   label: 'Livreurs' },
    { href: '/ma-societe', label: 'Ma société' },
  ],
  company_operator: [
    { href: '/',          label: 'Tableau de bord' },
    { href: '/commandes', label: 'Commandes' },
    { href: '/livreurs',  label: 'Livreurs' },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  super_admin:      'Super administrateur',
  admin:            'Administrateur',
  supervisor:       'Superviseur',
  company_owner:    'Responsable société',
  company_operator: 'Opérateur société',
};

export function AdminNav({ user }: { user: CurrentUser }) {
  const items = NAV_BY_ROLE[user.profile.role] ?? [];
  const displayName =
    [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <BrandMark variant="light" size="md" href="/" />

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-ink">{displayName}</p>
            <p className="text-xs text-ink-subtle">{ROLE_LABELS[user.profile.role] ?? user.profile.role}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex min-h-touch items-center justify-center rounded-lg border border-surface-border bg-white px-3 text-sm font-medium text-ink-muted hover:bg-surface-muted focus-visible:outline-none"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="flex gap-1 overflow-x-auto pb-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex min-h-touch items-center whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-3 py-1 text-sm font-medium text-ink-muted hover:border-primary hover:text-primary"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
