'use server';

import { createSupabaseServer } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signInWithEmail(_prevState, formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) {
    return { error: 'Email and password required' };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message || 'Failed to sign in' };
  redirect('/');
}
