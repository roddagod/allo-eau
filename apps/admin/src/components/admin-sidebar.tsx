'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { signOutAction } from '@/lib/auth-actions';
import {
  DashboardIcon,
  ClipboardIcon,
  BuildingIcon,
  MapIcon,
  TagIcon,
  UsersIcon,
  ListIcon,
  MenuIcon,
  XIcon,
} from '@/components/icons';

type NavItem = { href: string; label: string; Icon: React.ComponentType<{ className?: string }> };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  super_admin: [
    { href: '/',             label: 'Tableau de bord', Icon: DashboardIcon },
    { href: '/commandes',    label: 'Commandes',       Icon: ClipboardIcon },
    { href: '/carte',        label: 'Carte',           Icon: MapIcon },
    { href: '/societes',     label: 'Sociétés',        Icon: BuildingIcon },
    { href: '/zones',        label: 'Zones',           Icon: MapIcon },
    { href: '/tarifs',       label: 'Tarifs',          Icon: TagIcon },
    { href: '/utilisateurs', label: 'Utilisateurs',    Icon: UsersIcon },
    { href: '/audit',        label: 'Audit',           Icon: ListIcon },
  ],
  admin: [
    { href: '/',          label: 'Tableau de bord', Icon: DashboardIcon },
    { href: '/commandes', label: 'Commandes',       Icon: ClipboardIcon },
    { href: '/carte',     label: 'Carte',           Icon: MapIcon },
    { href: '/societes',  label: 'Sociétés',        Icon: BuildingIcon },
    { href: '/tarifs',    label: 'Tarifs',          Icon: TagIcon },
  ],
  supervisor: [
    { href: '/',          label: 'Tableau de bord', Icon: DashboardIcon },
    { href: '/commandes', label: 'Commandes',       Icon: ClipboardIcon },
    { href: '/carte',     label: 'Carte',           Icon: MapIcon },
    { href: '/incidents', label: 'Incidents',       Icon: ListIcon },
  ],
  company_owner: [
    { href: '/',           label: 'Tableau de bord', Icon: DashboardIcon },
    { href: '/commandes',  label: 'Commandes',       Icon: ClipboardIcon },
    { href: '/livreurs',   label: 'Livreurs',        Icon: UsersIcon },
    { href: '/ma-societe', label: 'Ma société',      Icon: BuildingIcon },
  ],
  company_operator: [
    { href: '/',          label: 'Tableau de bord', Icon: DashboardIcon },
    { href: '/commandes', label: 'Commandes',       Icon: ClipboardIcon },
    { href: '/livreurs',  label: 'Livreurs',        Icon: UsersIcon },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  super_admin:      'Super administrateur',
  admin:            'Administrateur',
  supervisor:       'Superviseur',
  company_owner:    'Responsable société',
  company_operator: 'Opérateur société',
};

export function AdminSidebar({
  user,
}: {
  user: {
    email: string | null;
    profile: { firstName: string | null; lastName: string | null; role: string };
  };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV_BY_ROLE[user.profile.role] ?? [];
  const displayName =
    [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ') || user.email;

  const Nav = () => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {items.map(({ href, label, Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
              (active
                ? 'bg-primary text-white'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink')
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const UserBlock = () => (
    <div className="border-t border-surface-border p-4">
      <div className="mb-3">
        <p className="truncate text-sm font-medium text-ink">{displayName}</p>
        <p className="text-xs text-ink-subtle">
          {ROLE_LABELS[user.profile.role] ?? user.profile.role}
        </p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-muted"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-surface-border bg-white lg:flex lg:flex-col">
        <div className="border-b border-surface-border px-4 py-4">
          <BrandMark variant="light" size="md" href="/" />
        </div>
        <Nav />
        <UserBlock />
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-border bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted"
          aria-label="Ouvrir le menu"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <BrandMark variant="light" size="sm" href="/" />
        <div className="w-10" aria-hidden />
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-4">
              <BrandMark variant="light" size="sm" href="/" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted"
                aria-label="Fermer le menu"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <Nav />
            <UserBlock />
          </aside>
        </div>
      )}
    </>
  );
}
