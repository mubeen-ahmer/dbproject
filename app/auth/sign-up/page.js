'use client';
import { useActionState, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail } from './actions';

function SignUpInner() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);
  const [intent, setIntent] = useState('student');
  const params = useSearchParams();

  useEffect(() => {
    const r = params.get('role');
    if (r === 'writer') setIntent('writer');
  }, [params]);

  const isWriter = intent === 'writer';

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
        <Link href="/auth/sign-in" className="text-sm text-gray-400 hover:text-white transition">
          Already have an account? <span className="text-indigo-400">Sign in</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2.5 mb-8">
            <button
              type="button"
              onClick={() => setIntent('student')}
              className={`relative p-5 rounded-xl text-left transition ${
                intent === 'student'
                  ? 'bg-indigo-500/10 border-[1.5px] border-indigo-500'
                  : 'bg-white/[0.04] border-[1.5px] border-white/10 hover:bg-white/[0.07] hover:border-white/15'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-[9px] flex items-center justify-center mb-3 ${
                  intent === 'student' ? 'bg-indigo-500/20' : ''
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <div className="text-sm font-bold mb-0.5">I&apos;m a Student</div>
              <div className="text-[0.78rem] text-gray-500 leading-snug">Post orders, review bids, get help</div>
              {intent === 'student' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIntent('writer')}
              className={`relative p-5 rounded-xl text-left transition ${
                intent === 'writer'
                  ? 'bg-teal-500/[0.08] border-[1.5px] border-teal-500'
                  : 'bg-white/[0.04] border-[1.5px] border-white/10 hover:bg-white/[0.07] hover:border-white/15'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-[9px] flex items-center justify-center mb-3 ${
                  intent === 'writer' ? 'bg-teal-500/15' : ''
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isWriter ? '#5eead4' : '#818cf8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </div>
              <div className="text-sm font-bold mb-0.5">I&apos;m a Writer</div>
              <div className="text-[0.78rem] text-gray-500 leading-snug">Bid on orders, earn from your expertise</div>
              {intent === 'writer' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              {isWriter ? 'Apply as a writer' : 'Create your student account'}
            </h1>
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/auth/sign-in" className="text-indigo-400 hover:text-indigo-300">
                Sign in instead
              </Link>
            </p>
          </div>

          {isWriter && (
            <div className="flex items-start gap-2.5 bg-teal-500/[0.08] border border-teal-500/20 rounded-xl px-4 py-3.5 mb-5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="text-[0.82rem] text-teal-300 leading-relaxed">
                <strong className="font-semibold">Writers go through an approval process.</strong> After signing up
                you&apos;ll complete an onboarding form (subjects, services, sample work, bio) — then our team reviews
                your application before you can start bidding.
              </div>
            </div>
          )}

          <form action={formAction}>
            <input type="hidden" name="intent" value={intent} />
            <div className="flex flex-col gap-4 mb-5">
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Full name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Jane Appleseed"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-indigo-500/5"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Email address</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="jane@university.edu"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-indigo-500/5"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-indigo-500/5"
                />
              </div>
            </div>

            {state?.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 text-sm text-red-300 mb-4">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-3.5 rounded-lg text-sm font-semibold transition mb-5 disabled:opacity-50 disabled:cursor-not-allowed ${
                isWriter ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'bg-indigo-500 hover:bg-indigo-400 text-white'
              }`}
            >
              {isPending
                ? 'Creating…'
                : isWriter
                ? 'Submit writer application'
                : 'Create student account'}
            </button>

            <p className="text-[0.78rem] text-gray-600 text-center leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="#" className="text-gray-500 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-gray-500 underline">
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function SignUpForm() {
  return (
    <Suspense fallback={null}>
      <SignUpInner />
    </Suspense>
  );
}
