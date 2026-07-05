import { BrandMark } from '@/components/brand/brand-mark';
import { LoginForm } from './login-form';

export const metadata = { title: 'Connexion — Livreur' };

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-ink-soft">
      <header className="px-4 py-4 sm:px-6">
        <BrandMark variant="dark" size="md" href={null} />
      </header>

      <main className="mx-auto flex max-w-md flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-lg bg-white/5 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Espace livreur
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Connexion à votre poste
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Réservé aux livreurs habilités par une société homologuée.
          </p>

          <LoginForm />
        </div>
      </main>
    </div>
  );
}
