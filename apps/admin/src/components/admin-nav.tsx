import Link from 'next/link';
import { signOutAction } from '@/lib/auth-actions';
import type { CurrentUser } from '@eaupourtous/db';

type NavItem = { href: string; label: string };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  super_admin: [
    { href: '/',                label: 'Tableau de bord' },
    { href: '/commandes',       label: 'Commandes' },
    { href: '/societes',        label: 'Sociétés' },
    { href: '/zones',           label: 'Zones' },
    { href: '/tarifs',          label: 'Tarifs' },
    { href: '/utilisateurs',    label: 'Utilisateurs' },
    { href: '/audit',           label: 'Audit' },
  ],
  admin: [
    { href: '/',                label: 'Tableau de bord' },
    { href: '/commandes',       label: 'Commandes' },
    { href: '/societes',        label: 'Sociétés' },
    { href: '/zones',           label: 'Zones' },
    { href: '/tarifs',          label: 'Tarifs' },
  ],
  supervisor: [
    { href: '/',                label: 'Tableau de bord' },
    { href: '/commandes',       label: 'Commandes' },
    { href: '/incidents',       label: 'Incidents' },
  ],
  company_owner: [
    { href: '/',                label: 'Tableau de bord' },
    { href: '/commandes',       label: 'Commandes' },
    { href: '/livreurs',        label: 'Livreurs' },
    { href: '/ma-societe',      label: 'Ma société' },
  ],
  company_operator: [
    { href: '/',                label: 'Tableau de bord' },
    { href: '/commandes',       label: 'Commandes' },
    { href: '/livreurs',        label: 'Livreurs' },
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
  const displayName = [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-gabon-green">Administration</p>
          <p className="text-sm font-semibold">Eau pour Tous — Libreville</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.profile.role] ?? user.profile.role}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 text-sm">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
