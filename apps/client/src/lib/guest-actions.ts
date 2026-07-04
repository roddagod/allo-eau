'use server';

import { createHash, randomInt } from 'node:crypto';
import { createAdminClient } from '@eaupourtous/db/admin';
import { guestOrderDraftSchema, otpCodeSchema, type GuestOrderDraft } from '@eaupourtous/domain/schemas';
import { normalizeGabonPhone, sendSms } from '@/lib/sms';
import { redirect } from 'next/navigation';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type SendOtpState =
  | { step: 'form';   ok: boolean; message?: string; fieldErrors?: Record<string, string> }
  | { step: 'verify'; ok: true;    verificationId: string; phoneMasked: string };

export type VerifyOtpState = {
  ok: boolean;
  message?: string;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function maskPhone(phone241: string): string {
  // 24177170462 → +241 77 XX XX 462
  return `+241 ${phone241.slice(3, 5)} XX XX ${phone241.slice(-3)}`;
}

// -----------------------------------------------------------------------------
// Étape 1 — Envoi de l'OTP
// -----------------------------------------------------------------------------

export async function sendGuestOtpAction(
  _prev: SendOtpState,
  formData: FormData,
): Promise<SendOtpState> {
  const draft: unknown = {
    firstName:             formData.get('firstName'),
    lastName:              formData.get('lastName'),
    phone:                 formData.get('phone'),
    zoneId:                formData.get('zoneId'),
    address:               formData.get('address'),
    deliveryLandmark:      formData.get('deliveryLandmark') || undefined,
    clientInstructions:    formData.get('clientInstructions') || undefined,
    volumeLiters:          Number(formData.get('volumeLiters')),
    quantity:              Number(formData.get('quantity')),
    paymentMethod:         formData.get('paymentMethod'),
    preferredDeliveryDate: formData.get('preferredDeliveryDate') || undefined,
    preferredDeliveryTime: formData.get('preferredDeliveryTime') || undefined,
  };

  const parsed = guestOrderDraftSchema.safeParse(draft);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { step: 'form', ok: false, message: 'Vérifiez les champs.', fieldErrors };
  }

  const phone241 = normalizeGabonPhone(parsed.data.phone);
  if (!phone241) {
    return { step: 'form', ok: false, message: 'Numéro invalide (format Gabon).' };
  }

  const admin = createAdminClient();
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000).toISOString();

  const { data: verification, error } = await admin
    .from('phone_verifications')
    .insert({
      phone: phone241,
      code_hash: codeHash,
      order_draft: parsed.data,
      expires_at: expiresAt,
    })
    .select('id')
    .single<{ id: string }>();

  if (error || !verification) {
    return {
      step: 'form',
      ok: false,
      message: 'Impossible de créer la vérification. Réessayez.',
    };
  }

  const sms = await sendSms({
    to: phone241,
    text: `Allô Eau : votre code de confirmation est ${code}. Valide ${OTP_EXPIRY_MINUTES} min.`,
  });

  if (!sms.ok) {
    return {
      step: 'form',
      ok: false,
      message: `Envoi SMS échoué : ${sms.error ?? 'inconnu'}`,
    };
  }

  return {
    step: 'verify',
    ok: true,
    verificationId: verification.id,
    phoneMasked: maskPhone(phone241),
  };
}

// -----------------------------------------------------------------------------
// Étape 2 — Vérification du code et création de la commande
// -----------------------------------------------------------------------------

export async function verifyGuestOtpAction(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const verificationId = String(formData.get('verificationId') ?? '');
  const rawCode = String(formData.get('code') ?? '');

  if (!verificationId) {
    return { ok: false, message: 'Session expirée. Recommencez.' };
  }

  const codeParsed = otpCodeSchema.safeParse(rawCode);
  if (!codeParsed.success) {
    return { ok: false, message: 'Code invalide (6 chiffres requis).' };
  }

  const admin = createAdminClient();
  const { data: challenge, error } = await admin
    .from('phone_verifications')
    .select('id, code_hash, expires_at, attempts, verified_at, order_draft, phone')
    .eq('id', verificationId)
    .single<{
      id: string;
      code_hash: string;
      expires_at: string;
      attempts: number;
      verified_at: string | null;
      order_draft: GuestOrderDraft;
      phone: string;
    }>();

  if (error || !challenge) {
    return { ok: false, message: 'Vérification introuvable ou expirée.' };
  }

  if (challenge.verified_at) {
    return { ok: false, message: 'Ce code a déjà été utilisé.' };
  }

  if (new Date(challenge.expires_at) < new Date()) {
    return { ok: false, message: 'Code expiré. Recommencez.' };
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, message: 'Trop de tentatives. Recommencez.' };
  }

  if (hashCode(codeParsed.data) !== challenge.code_hash) {
    await admin
      .from('phone_verifications')
      .update({ attempts: challenge.attempts + 1 })
      .eq('id', challenge.id);
    return {
      ok: false,
      message: `Code incorrect (${OTP_MAX_ATTEMPTS - challenge.attempts - 1} tentative(s) restante(s)).`,
    };
  }

  // Marque comme vérifié
  await admin
    .from('phone_verifications')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', challenge.id);

  // Création de la commande côté service_role (bypass RLS)
  const draft = challenge.order_draft;
  const clientSnapshot = {
    first_name: draft.firstName,
    last_name:  draft.lastName,
    phone:      challenge.phone,
    email:      null,
    guest:      true,
  };

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      client_id:               null,
      created_by_user_id:      null,
      client_snapshot:         clientSnapshot,
      zone_id:                 draft.zoneId,
      address:                 draft.address,
      delivery_landmark:       draft.deliveryLandmark ?? null,
      volume_liters:           draft.volumeLiters,
      quantity:                draft.quantity,
      payment_method:          draft.paymentMethod,
      preferred_delivery_date: draft.preferredDeliveryDate ?? null,
      preferred_delivery_time: draft.preferredDeliveryTime ?? null,
      client_instructions:     draft.clientInstructions ?? null,
    })
    .select('id, reference, guest_access_token')
    .single<{ id: string; reference: string; guest_access_token: string }>();

  if (orderError || !order) {
    return {
      ok: false,
      message: `Impossible de créer la commande : ${orderError?.message ?? 'inconnu'}`,
    };
  }

  redirect(`/suivre/${order.id}?t=${order.guest_access_token}`);
}
