'use client';
import { useActionState, useState } from 'react';
import { signUpWithEmail } from './actions';

export default function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);
  const [intent, setIntent] = useState('student');

  return (
    <form action={formAction} className="flex flex-col gap-5 min-h-screen items-center justify-center bg-gray-900">
      <h1 className="text-2xl font-bold text-white">Create Account</h1>

      <div className="flex gap-3 w-80">
        <button type="button" onClick={() => setIntent('student')}
          className={`flex-1 py-3 rounded-md font-semibold transition ${
            intent === 'student'
              ? 'bg-indigo-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}>
          I'm a Student
        </button>
        <button type="button" onClick={() => setIntent('writer')}
          className={`flex-1 py-3 rounded-md font-semibold transition ${
            intent === 'writer'
              ? 'bg-indigo-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}>
          I'm a Writer
        </button>
      </div>

      <input type="hidden" name="intent" value={intent} />

      <input name="name" type="text" required placeholder="Name"
        className="w-80 rounded-md bg-white/5 px-3 py-2 text-white outline outline-white/10 focus:outline-indigo-500"/>

      <input name="email" type="email" required placeholder="Email"
        className="w-80 rounded-md bg-white/5 px-3 py-2 text-white outline outline-white/10 focus:outline-indigo-500"/>

      <input name="password" type="password" required placeholder="Password (min 8 chars)"
        className="w-80 rounded-md bg-white/5 px-3 py-2 text-white outline outline-white/10 focus:outline-indigo-500"/>

      {state?.error && <div className="text-red-500 text-sm">{state.error}</div>}

      <button type="submit" disabled={isPending}
        className="w-80 rounded-md bg-indigo-500 py-2 text-white font-semibold hover:bg-indigo-400 disabled:opacity-50">
        {isPending ? 'Creating...' : `Create ${intent === 'writer' ? 'Writer' : 'Student'} Account`}
      </button>

      <a href="/auth/sign-in" className="text-indigo-400 hover:underline text-sm">
        Already have an account? Sign in
      </a>
    </form>
  );
}
