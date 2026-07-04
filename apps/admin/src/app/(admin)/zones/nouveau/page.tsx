import Link from 'next/link';
import { ZoneForm } from './zone-form';

export const metadata = { title: 'Nouveau quartier — Administration' };

export default function NewZonePage() {
  return (
    <div>
      <Link href="/zones" className="text-sm font-medium text-ink-muted hover:text-primary">
        ← Retour aux quartiers
      </Link>
      <header className="mt-3 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Nouveau</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Créer un quartier</h1>
      </header>

      <div className="max-w-2xl rounded-lg bg-white p-5 shadow-sm sm:p-6">
        <ZoneForm />
      </div>
    </div>
  );
}
