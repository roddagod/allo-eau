'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { createCompanyAction, type ActionResult } from '@/lib/company-actions';

const INITIAL: ActionResult = { ok: true };

export function CompanyCreateForm() {
  const [state, action, pending] = useActionState(createCompanyAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="commercial_name" required>Nom commercial</Label>
          <Input id="commercial_name" name="commercial_name" required autoFocus placeholder="Ex. Eau Fraîche Libreville" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="legal_name">Raison sociale</Label>
          <Input id="legal_name" name="legal_name" placeholder="Ex. SARL Eau Fraîche Libreville" />
        </div>
        <div>
          <Label htmlFor="operator_type" required>Type d’opérateur</Label>
          <Select id="operator_type" name="operator_type" required defaultValue="private">
            <option value="private">Privé (homologué DGE)</option>
            <option value="military">Militaire (Forces de Défense et de Sécurité)</option>
            <option value="municipal">Public / Municipal</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="rccm">RCCM / Identifiant administratif</Label>
          <Input id="rccm" name="rccm" placeholder="Ex. RCCM-LBV-2026-1234" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="manager_name">Responsable</Label>
          <Input id="manager_name" name="manager_name" placeholder="Nom complet du responsable" />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="07 XX XX XX XX" autoComplete="tel" />
        </div>
        <div>
          <Label htmlFor="email">Email professionnel</Label>
          <Input id="email" name="email" type="email" placeholder="contact@example.ga" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="address">Adresse du siège</Label>
          <Textarea id="address" name="address" placeholder="Adresse complète, quartier…" />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-lg bg-primary-50 p-3">
        <input type="checkbox" name="activate" className="h-4 w-4 accent-primary" defaultChecked />
        <div>
          <p className="text-sm font-medium text-ink">Activer immédiatement</p>
          <p className="text-xs text-ink-muted">
            La société pourra recevoir des commandes dès qu’une zone lui sera attribuée. Sinon elle
            reste en attente de validation par la DGE.
          </p>
        </div>
      </label>

      <FieldError message={state.message} />

      <div className="flex gap-3 pt-2">
        <Button type="submit" size="lg" loading={pending}>Créer la société</Button>
      </div>
    </form>
  );
}
