import 'server-only';

/**
 * Provider SMS — Wirepick (passerelle Gabon). Copie légère du client SMS
 * utilisé côté client. Sert à envoyer les credentials driver.
 */
const WIREPICK_BASE = 'https://api.wirepick.com';

export type SmsResult = { ok: boolean; error?: string; raw?: string };

export function normalizeGabonPhone(input: string): string | null {
  let p = input.trim().replace(/[\s().-]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('00')) p = p.slice(2);
  if (/^241[67]\d{7}$/.test(p)) return p;
  if (/^2410[67]\d{7}$/.test(p)) return `241${p.slice(4)}`;
  if (/^0[67]\d{7}$/.test(p)) return `241${p.slice(1)}`;
  if (/^[67]\d{7}$/.test(p)) return `241${p}`;
  return null;
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export async function sendSms(args: { to: string; text: string }): Promise<SmsResult> {
  const client = process.env.WIREPICK_CLIENT;
  const password = process.env.WIREPICK_PASSWORD;
  const from = process.env.WIREPICK_FROM || 'APISMS';

  if (!client || !password) return { ok: false, error: 'WIREPICK non configuré.' };
  const phone = normalizeGabonPhone(args.to);
  if (!phone) return { ok: false, error: `Numéro invalide : ${args.to}` };

  const params = new URLSearchParams({ client, password, phone, text: stripAccents(args.text), from });
  try {
    const resp = await fetch(`${WIREPICK_BASE}/httpsms/send?${params.toString()}`);
    const raw = (await resp.text()).trim();
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}`, raw };
    return { ok: true, raw };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
