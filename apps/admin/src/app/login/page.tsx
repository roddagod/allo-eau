import { LoginForm } from './login-form';

export const metadata = { title: 'Connexion — Administration' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-widest text-gabon-green">
          Ministère de l’Accès Universel à l’Eau et à l’Énergie
        </p>
        <h1 className="mt-2 text-3xl font-bold">Administration</h1>
        <p className="mt-1 text-sm text-slate-600">Plateforme Eau Libreville</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold">Connexion</h2>
        <p className="mt-1 text-xs text-slate-600">Accès réservé au personnel habilité.</p>
        <LoginForm />
      </section>
    </main>
  );
}
