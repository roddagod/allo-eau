import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { signOutAction } from '@/lib/auth-actions';
import type { CurrentUser } from '@eaupourtous/db';

const NAV = [
  { href: '/commander',    label: 'Commander' },
  { href: '/mes-commandes', label: 'Mes commandes' },
] as const;

export function AppNav({ user }: { user: CurrentUser }) {
  const displayName =
    [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ') ||
    user.email ||
    'Bienvenue';

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <BrandMark variant="light" size="md" />

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-muted sm:inline">{displayName}</span>
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

      {/* Nav secondaire */}
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ul className="flex gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex min-h-touch items-center rounded-t-lg border-b-2 border-transparent px-3 py-1 text-sm font-medium text-ink-muted hover:border-primary hover:text-primary"
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
