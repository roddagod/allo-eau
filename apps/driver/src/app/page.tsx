export default function DriverHome() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-widest text-gabon-green">
          Espace livreur
        </p>
        <h1 className="mt-1 text-3xl font-bold">Eau pour Tous</h1>
      </header>

      <section className="mt-10 flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-400">Connectez-vous pour voir votre tournée du jour.</p>
        <button
          type="button"
          className="mt-6 w-full rounded-xl bg-gabon-green py-4 text-lg font-semibold text-white active:scale-[0.98]"
        >
          Se connecter
        </button>
      </section>

      <footer className="mt-6 text-center text-xs text-slate-500">
        Application optimisée pour usage hors-ligne — v0.0.0
      </footer>
    </main>
  );
}
