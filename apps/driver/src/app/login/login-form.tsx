'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { signInAction, type ActionState } from '@/lib/auth-actions';

const INITIAL: ActionState = { ok: true };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, INITIAL);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="email" required className="text-white/80">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="bg-white text-ink" />
      </div>
      <div>
        <Label htmlFor="password" required className="text-white/80">Mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="bg-white text-ink" />
      </div>
      <FieldError message={state.message} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Se connecter
      </Button>
    </form>
  );
}
