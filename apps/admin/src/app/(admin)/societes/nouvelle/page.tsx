import Link from 'next/link';
import { CompanyCreateForm } from './company-create-form';

export const metadata = { title: 'Nouvelle société — Administration' };

export default function NewCompanyPage() {
  return (
    <div>
      <Link href="/societes" className="text-sm font-medium text-ink-muted hover:text-primary">
        ← Retour aux sociétés
      </Link>
      <header className="mt-3 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Nouvelle</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Créer une société</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Après création, vous pourrez lui attribuer des zones de livraison.
        </p>
      </header>

      <div className="max-w-3xl rounded-lg bg-white p-5 shadow-sm sm:p-6">
        <CompanyCreateForm />
      </div>
    </div>
  );
}
