import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata = { title: 'Connexion — Allô Eau' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Connexion
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Se connecter</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="font-semibold text-primary underline">
            Créer un compte
          </Link>
        </p>
      </div>

      <LoginForm searchParams={searchParams} />
    </div>
  );
}
