'use server';

import { createSupabaseServer } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signUpWithEmail(_prevState, formData) {
  const email = formData.get('email');
  const name = formData.get('name');
  const password = formData.get('password');
  const intent = formData.get('intent');

  if (!email || !password || !name) {
    return { error: 'Name, email and password must be provided.' };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) return { error: error.message || 'Failed to create account' };

  if (intent === 'writer') {
    redirect('/writer-onboarding');
  }
  redirect('/');
}
