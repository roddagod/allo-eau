'use client';

import { useActionState, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { ProgressBar, StepHeader, type WizardStep } from '@/components/wizard/progress-bar';
import { formatFcfa, calculateOrderTotal } from '@eaupourtous/domain/pricing';
import { PhoneIcon } from '@/components/icons';
import { createOrderAction, type OrderActionState } from '@/lib/order-actions';
import {
  sendGuestOtpAction,
  verifyGuestOtpAction,
  type SendOtpState,
  type VerifyOtpState,
} from '@/lib/guest-actions';

type Zone = { id: string; name: string; sector: string | null };
type Price = { tier_id: string; volume_liters: number; label: string; price_fcfa: number };
type Mode = 'guest' | 'auth';

const GUEST_STEPS = [
  { id: 'contact',  label: 'Contact' },
  { id: 'address',  label: 'Livraison' },
  { id: 'volume',   label: 'Quantité' },
  { id: 'schedule', label: 'Paiement' },
] as const satisfies ReadonlyArray<WizardStep>;

const AUTH_STEPS = [
  { id: 'address',  label: 'Livraison' },
  { id: 'volume',   label: 'Quantité' },
  { id: 'schedule', label: 'Paiement' },
] as const satisfies ReadonlyArray<WizardStep>;

type StepId = 'contact' | 'address' | 'volume' | 'schedule';

const paymentLabels = {
  cash:         'Espèces à la livraison',
  airtel_money: 'Airtel Money',
  moov_money:   'Moov Money',
  clickpay:     'ClickPay',
} as const;

const INITIAL_SEND: SendOtpState = { step: 'form', ok: true };
const INITIAL_VERIFY: VerifyOtpState = { ok: true };
const INITIAL_AUTH: OrderActionState = { ok: true };

// ---------------------------------------------------------------------------

export function OrderFlow(props: {
  mode: Mode;
  zones: Zone[];
  prices: Price[];
  defaultZoneId: string;
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultAddress: string;
  defaultLandmark: string;
  defaultInstructions: string;
}) {
  const { mode, zones, prices } = props;
  const steps = mode === 'guest' ? GUEST_STEPS : AUTH_STEPS;
  const firstStep: StepId = steps[0]!.id;

  const [step, setStep] = useState<StepId>(firstStep);

  // Actions serveur — deux jeux selon le mode
  const [sendState, sendAction, sending]  = useActionState(sendGuestOtpAction, INITIAL_SEND);
  const [authState, authAction, authPending] = useActionState(createOrderAction, INITIAL_AUTH);

  // Champs contrôlés partagés
  const [firstName, setFirstName]         = useState(props.defaultFirstName);
  const [lastName, setLastName]           = useState(props.defaultLastName);
  const [phone, setPhone]                 = useState(props.defaultPhone);
  const [zoneId, setZoneId]               = useState(props.defaultZoneId);
  const [address, setAddress]             = useState(props.defaultAddress);
  const [deliveryLandmark, setDeliveryLandmark]     = useState(props.defaultLandmark);
  const [clientInstructions, setClientInstructions] = useState(props.defaultInstructions);
  const [volumeLiters, setVolumeLiters]   = useState<number>(prices[0]?.volume_liters ?? 1000);
  const [quantity, setQuantity]           = useState<number>(1);
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState('');
  const [preferredDeliveryTime, setPreferredDeliveryTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<keyof typeof paymentLabels>('cash');

  const currentPrice = useMemo(
    () => prices.find((p) => p.volume_liters === volumeLiters) ?? null,
    [prices, volumeLiters],
  );
  const total = currentPrice ? calculateOrderTotal(currentPrice.price_fcfa, quantity) : 0;

  const zonesBySector = zones.reduce<Record<string, Zone[]>>((acc, z) => {
    const s = z.sector ?? 'Autre';
    (acc[s] ??= []).push(z);
    return acc;
  }, {});

  // Si guest et OTP a été envoyé, passe à l'étape OTP
  if (mode === 'guest' && sendState.step === 'verify') {
    return (
      <OtpStep
        verificationId={sendState.verificationId}
        phoneMasked={sendState.phoneMasked}
      />
    );
  }

  const currentIdx = steps.findIndex((s) => s.id === step);
  const isLast = step === 'schedule';
  const action = mode === 'guest' ? sendAction : authAction;
  const pending = mode === 'guest' ? sending : authPending;

  // Erreurs par champ + message d'erreur global — normalisation entre les deux jeux d'actions
  let err: Record<string, string> = {};
  let errorMessage: string | undefined;

  if (mode === 'guest') {
    if (sendState.step === 'form') {
      err = sendState.fieldErrors ?? {};
      errorMessage = sendState.message;
    }
  } else {
    err = authState.fieldErrors ?? {};
    errorMessage = authState.message;
  }

  const canGoNext = (): boolean => {
    if (step === 'contact')  return firstName.trim().length > 0 && lastName.trim().length > 0 && phone.trim().length >= 8;
    if (step === 'address')  return zoneId !== '' && address.trim().length > 0;
    if (step === 'volume')   return volumeLiters > 0 && quantity > 0;
    if (step === 'schedule') return paymentMethod !== undefined;
    return false;
  };

  const goNext = () => {
    const idx = Math.min(currentIdx + 1, steps.length - 1);
    setStep(steps[idx]!.id);
  };
  const goBack = () => {
    const idx = Math.max(currentIdx - 1, 0);
    setStep(steps[idx]!.id);
  };

  const stepIndex = (id: StepId) => steps.findIndex((s) => s.id === id) + 1;

  return (
    <form action={action} className="space-y-6">
      <ProgressBar steps={steps} currentIdx={currentIdx} />

      {/* Champs cachés — soumis avec le formulaire final */}
      {mode === 'guest' && (
        <>
          <input type="hidden" name="firstName" value={firstName} />
          <input type="hidden" name="lastName" value={lastName} />
          <input type="hidden" name="phone" value={phone} />
        </>
      )}
      <input type="hidden" name="zoneId" value={zoneId} />
      <input type="hidden" name="address" value={address} />
      <input type="hidden" name="deliveryLandmark" value={deliveryLandmark} />
      <input type="hidden" name="clientInstructions" value={clientInstructions} />
      <input type="hidden" name="volumeLiters" value={volumeLiters} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="preferredDeliveryDate" value={preferredDeliveryDate} />
      <input type="hidden" name="preferredDeliveryTime" value={preferredDeliveryTime} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

      <section className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6">
        {/* Étape Contact (guest uniquement) */}
        {step === 'contact' && (
          <div className="space-y-4">
            <StepHeader
              index={stepIndex('contact')}
              total={steps.length}
              title="Vos coordonnées"
              description="Nous utiliserons ce numéro pour vous confirmer la commande et vous notifier des étapes."
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fn" required>Prénom</Label>
                <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required />
                <FieldError message={err['firstName']} />
              </div>
              <div>
                <Label htmlFor="ln" required>Nom</Label>
                <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required />
                <FieldError message={err['lastName']} />
              </div>
            </div>
            <div>
              <Label htmlFor="ph" required>Téléphone (Gabon)</Label>
              <Input id="ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+241 XX XX XX XX" autoComplete="tel" required />
              <FieldError message={err['phone']} />
              <p className="mt-1 text-xs text-ink-subtle">Un code de vérification sera envoyé sur ce numéro.</p>
            </div>
          </div>
        )}

        {/* Étape Adresse */}
        {step === 'address' && (
          <div className="space-y-4">
            <StepHeader
              index={stepIndex('address')}
              total={steps.length}
              title="Adresse de livraison"
              description="Où doit-on livrer votre cuve ?"
            />
            <div>
              <Label htmlFor="zn" required>Quartier</Label>
              <Select id="zn" value={zoneId} onChange={(e) => setZoneId(e.target.value)} required aria-invalid={!!err['zoneId']}>
                <option value="" disabled>Choisir un quartier</option>
                {Object.entries(zonesBySector).map(([sector, list]) => (
                  <optgroup key={sector} label={`Secteur ${sector}`}>
                    {list.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <FieldError message={err['zoneId']} />
            </div>
            <div>
              <Label htmlFor="ad" required>Adresse précise</Label>
              <Textarea id="ad" value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Rue, immeuble, étage…" aria-invalid={!!err['address']} />
              <FieldError message={err['address']} />
            </div>
            <div>
              <Label htmlFor="lm">Repère de livraison</Label>
              <Input id="lm" value={deliveryLandmark} onChange={(e) => setDeliveryLandmark(e.target.value)} placeholder="En face de la pharmacie du carrefour" />
            </div>
            <div>
              <Label htmlFor="ci">Instructions au livreur</Label>
              <Textarea id="ci" value={clientInstructions} onChange={(e) => setClientInstructions(e.target.value)} placeholder="Portail bleu, appeler à l'arrivée…" />
            </div>
          </div>
        )}

        {/* Étape Volume */}
        {step === 'volume' && (
          <div className="space-y-4">
            <StepHeader
              index={stepIndex('volume')}
              total={steps.length}
              title="Volume et quantité"
              description="Combien de cuves souhaitez-vous ?"
            />
            <div>
              <p className="mb-2 text-sm font-medium text-ink-muted">Volume par cuve</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {prices.map((p) => {
                  const active = p.volume_liters === volumeLiters;
                  return (
                    <button
                      key={p.tier_id}
                      type="button"
                      onClick={() => setVolumeLiters(p.volume_liters)}
                      className={
                        'flex min-h-touch flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center transition ' +
                        (active
                          ? 'border-primary bg-primary-50'
                          : 'border-surface-border bg-white hover:border-primary-200')
                      }
                    >
                      <span className="text-sm font-semibold text-ink">{p.label}</span>
                      <span className="mt-1 text-xs text-ink-muted">{formatFcfa(p.price_fcfa)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="qty" required>Nombre de cuves</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="secondary" size="md" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuer">−</Button>
                <Input id="qty" type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="w-24 text-center" required />
                <Button type="button" variant="secondary" size="md" onClick={() => setQuantity((q) => Math.min(50, q + 1))} aria-label="Augmenter">+</Button>
              </div>
            </div>
          </div>
        )}

        {/* Étape Paiement + Récap */}
        {step === 'schedule' && (
          <div className="space-y-4">
            <StepHeader
              index={stepIndex('schedule')}
              total={steps.length}
              title="Créneau et paiement"
              description="Choisissez le créneau souhaité et le moyen de paiement."
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dt">Date souhaitée</Label>
                <Input id="dt" type="date" value={preferredDeliveryDate} onChange={(e) => setPreferredDeliveryDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <Label htmlFor="tm">Heure souhaitée</Label>
                <Input id="tm" type="time" value={preferredDeliveryTime} onChange={(e) => setPreferredDeliveryTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="pm" required>Moyen de paiement</Label>
              <Select id="pm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as keyof typeof paymentLabels)} required aria-invalid={!!err['paymentMethod']}>
                {Object.entries(paymentLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <FieldError message={err['paymentMethod']} />
            </div>

            <div className="mt-2 rounded-xl border border-primary-100 bg-primary-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Récapitulatif</p>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-ink-muted">Cuve</span><span className="text-ink">{currentPrice?.label ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Quantité</span><span className="text-ink">× {quantity}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Quartier</span><span className="truncate pl-3 text-right text-ink">{zones.find((z) => z.id === zoneId)?.name ?? '—'}</span></div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-primary-100 pt-3">
                <span className="text-sm font-medium text-ink">Total</span>
                <span className="text-2xl font-bold text-primary">{formatFcfa(total)}</span>
              </div>
              <p className="mt-2 text-xs text-ink-subtle">Livraison incluse — tarifs officiels.</p>
            </div>
          </div>
        )}
      </section>

      <FieldError message={errorMessage} />

      {/* Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        {isLast ? (
          <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending} disabled={!canGoNext()}>
            {mode === 'guest' ? 'Envoyer le code SMS' : 'Valider la commande'}
          </Button>
        ) : (
          <Button type="button" size="lg" className="w-full sm:w-auto" onClick={goNext} disabled={!canGoNext()}>
            Continuer
          </Button>
        )}
        {currentIdx > 0 && (
          <Button type="button" variant="secondary" size="lg" onClick={goBack} className="w-full sm:w-auto">
            Retour
          </Button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Écran OTP (guest uniquement, après envoi du SMS)
// ---------------------------------------------------------------------------

function OtpStep({ verificationId, phoneMasked }: { verificationId: string; phoneMasked: string }) {
  const [state, action, pending] = useActionState(verifyGuestOtpAction, INITIAL_VERIFY);

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-2xl border border-surface-border bg-white p-6 sm:p-8">
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary">
            <PhoneIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-ink">Vérification par SMS</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Nous venons d’envoyer un code à 6 chiffres au{' '}
            <span className="font-semibold text-ink">{phoneMasked}</span>.
          </p>
        </div>

        <input type="hidden" name="verificationId" value={verificationId} />

        <div className="mt-6">
          <Label htmlFor="code" required>Code de vérification</Label>
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
            placeholder="123 456"
            className="text-center font-mono text-2xl tracking-widest"
          />
          <FieldError message={state.message} />
          <p className="mt-2 text-center text-xs text-ink-subtle">
            Le code est valide pendant 10 minutes.
          </p>
        </div>

        <Button type="submit" size="lg" className="mt-6 w-full" loading={pending}>
          Confirmer la commande
        </Button>
      </section>
    </form>
  );
}
