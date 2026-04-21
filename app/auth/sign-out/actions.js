'use server';

import { createSupabaseServer } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/');
}
