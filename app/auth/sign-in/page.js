'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { signInWithEmail } from './actions';

export default function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <div className="min-h-screen flex flex-col bg-[#111827] text-white">
      <header className="flex items-center justify-between px-8 h-[60px] border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', fontSize: 13 }}
          >
            Ed
          </div>
          <span className="text-base font-bold">EduDesk</span>
        </Link>
        <Link href="/auth/sign-up" className="text-sm text-gray-400 hover:text-white transition">
          No account? <span className="text-indigo-400">Sign up free</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
        />

        <div className="w-full max-w-sm relative">
          <div className="mb-8">
            <h1 className="text-[1.6rem] font-bold tracking-tight mb-1.5">Welcome back</h1>
            <p className="text-sm text-gray-500">Sign in to your EduDesk account</p>
          </div>

          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 text-sm text-red-300 mb-4">
              {state.error}
            </div>
          )}

          <form action={formAction}>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400">Email address</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="jane@university.edu"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-indigo-500/5"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-400">Password</label>
                  <a href="#" className="text-xs text-gray-500 hover:text-indigo-300">
                    Forgot password?
                  </a>
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Your password"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-indigo-500/5"
                />
              </div>
            </div>

            <div className="h-px bg-white/5 mb-6" />

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold transition hover:-translate-y-px disabled:translate-y-0 flex items-center justify-center gap-2 mb-5"
            >
              {isPending && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
              )}
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="text-indigo-400 hover:text-indigo-300">
              Create one free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
