'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signUpWithEmail(_prevState, formData) {
  const email = formData.get('email');
  const name = formData.get('name');
  const password = formData.get('password');
  const intent = formData.get('intent');

  if (!email) return { error: 'Email address must be provided.' };

  const { error } = await auth.signUp.email({ email, name, password });

  if (error) return { error: error.message || 'Failed to create account' };

  if (intent === 'writer') {
    redirect('/writer-onboarding');
  }
  redirect('/');
}
