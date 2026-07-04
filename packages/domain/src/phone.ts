/**
 * Formatage téléphone Gabon.
 *   - Saisie utilisateur : format local `06XXXXXXX` / `07XXXXXXX`
 *   - Stockage DB        : format international `241[67]XXXXXXX` (via
 *                          `normalizeGabonPhone` dans lib/sms.ts)
 *   - Affichage UI       : format local `06XXXXXXX` / `07XXXXXXX`
 *                          (avec ou sans espacement)
 */

/**
 * Convertit tout format téléphone Gabon vers l'affichage local avec 0 initial.
 *   +24177170462   → 077170462
 *   24177170462    → 077170462
 *   77170462       → 077170462
 *   077170462      → 077170462
 *   +241 77 17 04 62 → 077170462
 *
 * Si `pretty = true`, ajoute des espaces : `07 71 70 04 62`.
 * Renvoie la chaîne d'origine si le format n'est pas gabonais reconnu.
 */
export function formatGabonPhoneDisplay(
  phone: string | null | undefined,
  { pretty = false }: { pretty?: boolean } = {},
): string {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');

  let local: string | null = null;

  // 241XXXXXXXX (11 chars)
  if (/^241[67]\d{7}$/.test(digits)) local = `0${digits.slice(3)}`;
  // 2410XXXXXXXX (12 chars — cas +241 + 0)
  else if (/^2410[67]\d{7}$/.test(digits)) local = `0${digits.slice(4)}`;
  // 0XXXXXXXX (9 chars local)
  else if (/^0[67]\d{7}$/.test(digits)) local = digits;
  // XXXXXXXX (8 chars sans 0)
  else if (/^[67]\d{7}$/.test(digits)) local = `0${digits}`;

  if (!local) return phone;

  if (pretty) {
    // 077170462 → 07 71 70 04 62
    return local.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{1})$/, '$1 $2 $3 $4$5').trim();
  }
  return local;
}
