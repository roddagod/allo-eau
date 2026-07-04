import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRightIcon, PhoneIcon, ClockIcon } from '@/components/icons';

export const metadata = { title: 'Suivre ma commande — Allô Eau' };

async function lookupByCode(formData: FormData) {
  'use server';
  const code = String(formData.get('code') ?? '').trim().toLowerCase();
  if (!code) return;
  redirect(`/s/${code}`);
}

export default function SuivrePage() {
  return (
    <div className="min-h-dvh bg-surface-muted">
      <PublicHeader hideNav />

      <main className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Suivi de commande
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
            Retrouver ma commande
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Utilisez le lien reçu par SMS ou le code court à 7 caractères.
          </p>
        </div>

        {/* Option 1 : code court */}
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <ClockIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Code court reçu par SMS</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Ex. « a3b7ktm » — inclus dans le lien <span className="font-mono">/s/xxxxxxx</span>
              </p>
            </div>
          </div>

          <form action={lookupByCode} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="code">Code court</Label>
              <Input
                id="code"
                name="code"
                type="text"
                inputMode="text"
                autoCapitalize="none"
                spellCheck={false}
                pattern="[a-z0-9]{5,12}"
                maxLength={12}
                required
                placeholder="a3b7ktm"
                className="font-mono uppercase"
              />
            </div>
            <Button type="submit" size="lg" className="w-full">
              Ouvrir la commande
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </form>
        </section>

        {/* Option 2 : par téléphone */}
        <section className="mt-4 rounded-lg bg-primary-50 p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <PhoneIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Retrouver toutes mes commandes</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Renseignez votre téléphone : nous vous enverrons un code SMS pour retrouver toutes
                vos commandes passées (avec ou sans compte).
              </p>
            </div>
          </div>

          <Link
            href="/mon-compte"
            className="mt-4 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
          >
            Accéder par téléphone
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </section>

        <p className="mt-8 text-center text-sm text-ink-muted">
          Pas encore de commande ?{' '}
          <Link href="/commander" className="font-semibold text-primary underline">
            Commander de l’eau
          </Link>
        </p>
      </main>
    </div>
  );
}
