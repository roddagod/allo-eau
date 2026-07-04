import { createAdminClient } from '@eaupourtous/db/admin';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Résolution des short links Allô Eau — allo-eau.ga/s/aBc123.
 *   - Trouve la commande par short_code
 *   - Redirige vers /suivre/[id]?t=token (guest) ou /mes-commandes/[id] (auth)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const { origin } = new URL(request.url);

  if (!code || code.length < 5 || code.length > 12) {
    return NextResponse.redirect(`${origin}/`);
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('id, guest_access_token, client_id')
    .eq('short_code', code.toLowerCase())
    .single<{ id: string; guest_access_token: string; client_id: string | null }>();

  if (!order) {
    return NextResponse.redirect(`${origin}/?notfound=${encodeURIComponent(code)}`);
  }

  if (order.client_id) {
    // Commande liée à un compte : redirige vers l'espace client (protégé)
    return NextResponse.redirect(`${origin}/mes-commandes/${order.id}`);
  }

  return NextResponse.redirect(`${origin}/suivre/${order.id}?t=${order.guest_access_token}`);
}
