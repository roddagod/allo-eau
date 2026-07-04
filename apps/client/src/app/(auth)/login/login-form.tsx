'use client';

import { useActionState, use } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { signInAction, signInWithGoogleAction, type ActionState } from '@/lib/auth-actions';

const INITIAL: ActionState = { ok: true };

export function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = use(searchParams);
  const [state, formAction, pending] = useActionState(signInAction, INITIAL);

  const externalError = params.error ? 'Connexion Google interrompue.' : null;
  const errorMessage = state.message ?? externalError;

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
        <div>
          <Label htmlFor="email" required>Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password" required>Mot de passe</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        <FieldError message={errorMessage ?? undefined} />

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Se connecter
        </Button>
      </form>
    </div>
  );
}
