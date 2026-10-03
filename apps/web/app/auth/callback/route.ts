import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Google sign-in returns here. New sign-ups are disabled, so only invited emails get in. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/', request.nextUrl.origin));
  }
  return NextResponse.redirect(new URL('/login?error=link', request.nextUrl.origin));
}
