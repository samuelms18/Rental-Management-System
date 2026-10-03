'use client';

import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';

export function GoogleButton({ label }: { label: string }) {
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={() =>
        createClient().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
      }
    >
      {label}
    </Button>
  );
}
