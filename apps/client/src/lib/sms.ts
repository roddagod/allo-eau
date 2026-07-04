import 'server-only';

/**
 * Provider SMS — Wirepick (passerelle Gabon).
 * https://api.wirepick.com/httpsms/send?client=..&password=..&phone=..&text=..&from=..
 *
 * Env requis :
 *   WIREPICK_CLIENT     identifiant client
 *   WIREPICK_PASSWORD   mot de passe API
 *   WIREPICK_FROM       expéditeur (sender ID, ex: EAULBV)
 *
 * Adapté depuis MasterclassRoyaute / billet.ga.
 */

const WIREPICK_BASE = 'https://api.wirepick.com';

export type SmsResult = {
  ok: boolean;
  provider: 'wirepick';
  msgid?: string;
  status?: string;
  numSms?: number;
  totalCost?: number;
  currency?: string;
  raw?: string;
  error?: string;
};

/**
 * Normalise un numéro gabonais → `241[67]XXXXXXX` (11 chiffres).
 * Accepte : 077170462 · 77170462 · +24177170462 · +241 07 71 70 462 · etc.
 */
export function normalizeGabonPhone(input: string): string | null {
  let p = input.trim().replace(/[\s().-]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('00')) p = p.slice(2);

  if (/^241[67]\d{7}$/.test(p)) return p;                  // déjà bon
  if (/^2410[67]\d{7}$/.test(p)) return `241${p.slice(4)}`;// +241 avec 0 local en trop
  if (/^0[67]\d{7}$/.test(p)) return `241${p.slice(1)}`;   // 077XXXXXXX
  if (/^[67]\d{7}$/.test(p)) return `241${p}`;              // 77XXXXXXX
  return null;
}

/**
 * Retire les accents (NFD + strip combining marks) pour rester en GSM-7.
 */
function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Envoie un SMS via Wirepick.
 * Le texte est nettoyé des accents pour rester en GSM-7 (≤ 160 caractères = 1 SMS).
 */
export async function sendSms(args: {
  to: string;
  text: string;
  from?: string;
}): Promise<SmsResult> {
  const client = process.env.WIREPICK_CLIENT;
  const password = process.env.WIREPICK_PASSWORD;
  const fromDefault = process.env.WIREPICK_FROM || 'EAULBV';

  if (!client || !password) {
    return {
      ok: false,
      provider: 'wirepick',
      error: 'WIREPICK_CLIENT ou WIREPICK_PASSWORD manquant.',
    };
  }

  const phone = normalizeGabonPhone(args.to);
  if (!phone) {
    return {
      ok: false,
      provider: 'wirepick',
      error: `Numéro invalide ou non gabonais : ${args.to}`,
    };
  }

  const text = stripAccents(args.text);

  const params = new URLSearchParams({
    client,
    password,
    phone,
    text,
    from: args.from || fromDefault,
  });

  try {
    const url = `${WIREPICK_BASE}/httpsms/send?${params.toString()}`;
    const resp = await fetch(url, { method: 'GET' });
    const raw = (await resp.text()).trim();

    if (!resp.ok) {
      return {
        ok: false,
        provider: 'wirepick',
        error: `HTTP ${resp.status}: ${raw.slice(0, 120)}`,
        raw,
      };
    }

    const extract = (tag: string) => {
      const m = raw.match(new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`, 'i'));
      return m ? m[1].trim() : undefined;
    };

    const msgid = extract('msgid');
    const rawStatus = (extract('status') || '').toUpperCase();
    const numSms = Number(extract('num_sms') || 1);
    const totalCost = Number(extract('total_cost') || 0);
    const currency = extract('currency') || 'XAF';

    const status =
      rawStatus === 'ACT' || rawStatus === 'ACCEPTED' ? 'accepted' :
      rawStatus.startsWith('REJ') ? 'rejected' :
      rawStatus.startsWith('FAIL') ? 'failed' :
      rawStatus ? 'pending' : 'unknown';

    const ok = status === 'accepted' || status === 'pending';

    if (!ok) {
      return {
        ok: false,
        provider: 'wirepick',
        status,
        msgid,
        error: rawStatus || `Réponse Wirepick : ${raw.slice(0, 120)}`,
        raw,
      };
    }

    return {
      ok: true,
      provider: 'wirepick',
      msgid,
      status,
      numSms,
      totalCost: Number.isFinite(totalCost) ? totalCost : undefined,
      currency,
      raw,
    };
  } catch (e) {
    return {
      ok: false,
      provider: 'wirepick',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
