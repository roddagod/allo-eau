'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { signUpAction, signInWithGoogleAction, type ActionState } from '@/lib/auth-actions';

type Zone = { id: string; name: string; sector: string | null };

const INITIAL: ActionState = { ok: true };

export function SignupForm({ zones }: { zones: Zone[] }) {
  const [state, formAction, pending] = useActionState(signUpAction, INITIAL);
  const err = state.fieldErrors ?? {};

  const zonesBySector = zones.reduce<Record<string, Zone[]>>((acc, z) => {
    const sector = z.sector ?? 'Autre';
    (acc[sector] ??= []).push(z);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <form action={signInWithGoogleAction}>
        <Button variant="secondary" size="lg" className="w-full">
          Continuer avec Google
        </Button>
      </form>

      <div className="relative text-center text-xs uppercase tracking-widest text-ink-subtle">
        <span className="relative z-10 bg-white px-3">ou par email</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-surface-border" />
      </div>

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName" required>Prénom</Label>
            <Input id="firstName" name="firstName" autoComplete="given-name" required aria-invalid={!!err['firstName']} />
            <FieldError message={err['firstName']} />
          </div>
          <div>
            <Label htmlFor="lastName" required>Nom</Label>
            <Input id="lastName" name="lastName" autoComplete="family-name" required aria-invalid={!!err['lastName']} />
            <FieldError message={err['lastName']} />
          </div>
        </div>

        <div>
          <Label htmlFor="phone" required>Téléphone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="07 XX XX XX XX"
            autoComplete="tel"
            required
            aria-invalid={!!err['phone']}
          />
          <FieldError message={err['phone']} />
        </div>

        <div>
          <Label htmlFor="email" required>Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!err['email']} />
          <FieldError message={err['email']} />
        </div>

        <div>
          <Label htmlFor="password" required>Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="8 caractères minimum"
            required
            aria-invalid={!!err['password']}
          />
          <FieldError message={err['password']} />
        </div>

        <div>
          <Label htmlFor="primaryZoneId" required>Quartier de livraison</Label>
          <Select
            id="primaryZoneId"
            name="primaryZoneId"
            required
            defaultValue=""
            aria-invalid={!!err['primaryZoneId']}
          >
            <option value="" disabled>Choisir un quartier</option>
            {Object.entries(zonesBySector).map(([sector, list]) => (
              <optgroup key={sector} label={`Secteur ${sector}`}>
                {list.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
          <FieldError message={err['primaryZoneId']} />
        </div>

        <FieldError message={state.message} />

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Créer mon compte
        </Button>

        <p className="text-center text-xs text-ink-subtle">
          L’adresse exacte vous sera demandée à votre première commande.
        </p>
      </form>
    </div>
  );
}
