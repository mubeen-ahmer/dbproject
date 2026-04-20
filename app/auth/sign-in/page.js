'use client';
import { useActionState } from 'react';
import { signInWithEmail } from './actions';

export default function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-5 min-h-screen items-center justify-center bg-gray-900">
      <h1 className="text-2xl font-bold text-white">Sign in</h1>

      <input name="email" type="email" required placeholder="Email"
        className="w-80 rounded-md bg-white/5 px-3 py-2 text-white outline outline-white/10 focus:outline-indigo-500"/>

      <input name="password" type="password" required placeholder="Password"
        className="w-80 rounded-md bg-white/5 px-3 py-2 text-white outline outline-white/10 focus:outline-indigo-500"/>

      {state?.error && <div className="text-red-500 text-sm">{state.error}</div>}

      <button type="submit" disabled={isPending}
        className="w-80 rounded-md bg-indigo-500 py-2 text-white font-semibold hover:bg-indigo-400">
        Sign in
      </button>
    </form>
  );
}
