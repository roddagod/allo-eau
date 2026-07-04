import { BrandMark } from '@/components/brand/brand-mark';
import { LoginForm } from './login-form';

export const metadata = { title: 'Connexion — Administration' };

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-surface-muted">
      <header className="border-b border-surface-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <BrandMark variant="light" size="md" href={null} />
          <p className="text-xs font-medium uppercase tracking-widest text-ink-subtle">
            Administration
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col px-4 py-14 sm:px-6">
        <div className="rounded-lg bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Connexion
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
            Accès personnel habilité
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Cet espace est réservé au personnel du Ministère et des sociétés homologuées.
          </p>

          <LoginForm />
        </div>
      </main>
    </div>
  );
}
