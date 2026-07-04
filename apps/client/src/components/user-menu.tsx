import Link from 'next/link';
import { getUser } from '@eaupourtous/db/get-user';
import { signOutAction } from '@/lib/auth-actions';

export async function UserMenu() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          Se connecter
        </Link>
        <Link
          href="/signup"
          className="rounded-xl bg-gabon-green px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Créer un compte
        </Link>
      </div>
    );
  }

  const name = [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ')
    || user.email
    || 'Bienvenue';

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-slate-700 sm:inline">{name}</span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
