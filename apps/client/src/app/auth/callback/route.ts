import { createServerClient } from '@eaupourtous/db/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Point de retour OAuth (Google) et confirmation email Supabase.
 * Échange le code d'autorisation contre une session, puis redirige.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
