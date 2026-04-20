'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signInWithEmail(_prevState, formData) {
  const { error } = await auth.signIn.email({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (error) return { error: error.message || 'Failed to sign in' };
  redirect('/');
}
