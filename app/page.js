import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    if (user.role === 'admin') redirect('/dashboard/admin');
    if (user.role === 'writer') redirect('/dashboard/writer');
    redirect('/dashboard/student');
  }

  return <LandingPage />;
}

function LogoMark({ size = 34 }) {
  return (
    <div
      className="flex items-center justify-center font-bold text-white rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-400"
      style={{ width: size, height: size, fontSize: size * 0.44, letterSpacing: '-0.5px' }}
    >
      Ed
    </div>
  );
}

function LandingPage() {
  return (
    <div className="w-full bg-[#111827] text-white">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-16 border-b border-white/5 backdrop-blur bg-[#111827]/85">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[1.1rem] font-bold tracking-tight">EduDesk</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {[
            ['#how-it-works', 'How it works'],
            ['#for-you', 'For students & writers'],
            ['#safety', 'Escrow & safety'],
            ['#about', 'About'],
            ['#contact', 'Contact'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <Link
            href="/auth/sign-in"
            className="px-4 py-2 rounded-md text-sm font-semibold border border-white/20 hover:bg-white/5 transition"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="px-4 py-2 rounded-md text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 transition"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-8 pt-28 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)',
          }}
        />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-xs font-semibold text-indigo-300 mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse-dot" />
            Academic Writing Marketplace
          </div>
          <h1
            className="font-bold leading-[1.1] tracking-tight mb-5"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', textWrap: 'balance' }}
          >
            Where students find{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-indigo-300 to-indigo-500">
              expert writers
            </span>
            , not shortcuts
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Post your assignment, receive competitive bids from verified writers, and pay only when you&apos;re
            satisfied — with every payment held in escrow.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/auth/sign-up?role=student"
              className="px-7 py-3.5 rounded-lg bg-indigo-500 text-white font-semibold transition hover:bg-indigo-400 hover:-translate-y-px"
              style={{ boxShadow: '0 4px 24px rgba(99,102,241,0.35)' }}
            >
              Post an order free
            </Link>
            <Link
              href="/auth/sign-up?role=writer"
              className="px-7 py-3.5 rounded-lg bg-white/5 border border-white/15 text-gray-200 font-semibold transition hover:bg-white/10"
            >
              Apply as a writer
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-12 justify-center mt-16 pt-12 border-t border-white/10 flex-wrap">
            {[
              ['10,000+', 'Orders completed'],
              ['2,400+', 'Verified writers'],
              ['98%', 'Satisfaction rate'],
              ['50+', 'Academic subjects'],
            ].map(([num, lbl]) => (
              <div key={lbl}>
                <div className="text-3xl font-bold tracking-tight">{num}</div>
                <div className="text-xs text-gray-500 mt-0.5">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="px-8 py-20 bg-[#0f1724]">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Simple process</div>
          <h2 className="text-4xl font-bold tracking-tight leading-tight mb-4" style={{ textWrap: 'balance' }}>
            From order to delivery in four steps
          </h2>
          <p className="text-lg text-gray-400 max-w-lg leading-relaxed">
            A structured workflow so nothing slips through the cracks — from posting your brief to downloading the
            final file.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0.5 mt-14 rounded-2xl overflow-hidden bg-white/5">
            {[
              {
                num: '01',
                title: 'Post your order',
                text: 'Describe your assignment, set your deadline, choose your subject and academic level. Takes under 3 minutes.',
                icon: (
                  <>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </>
                ),
              },
              {
                num: '02',
                title: 'Writers bid',
                text: 'Approved, subject-verified writers submit competitive bids with price, timeline, and a short pitch. You pick the best fit.',
                icon: (
                  <>
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </>
                ),
              },
              {
                num: '03',
                title: 'Payment held in escrow',
                text: 'Once you select a writer, funds are held securely. The writer only gets paid after you approve the completed work.',
                icon: (
                  <>
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </>
                ),
              },
              {
                num: '04',
                title: 'Review & approve',
                text: 'Download a watermarked preview, request revisions if needed (up to 3 included), then accept to release payment.',
                icon: <polyline points="20 6 9 17 4 12" />,
              },
            ].map((s) => (
              <div key={s.num} className="bg-[#111827] p-10">
                <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Step {s.num}</div>
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mb-5">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {s.icon}
                  </svg>
                </div>
                <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR STUDENTS / WRITERS */}
      <section id="for-you" className="px-8 py-20 bg-[#111827]">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">For everyone</div>
          <h2 className="text-4xl font-bold tracking-tight mb-4">Built for students. Built for writers.</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5 mt-14 rounded-2xl overflow-hidden bg-white/5">
            <div className="bg-[#111827] p-12">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6 bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                For Students
              </div>
              <h3 className="text-2xl font-bold mb-3">Get expert help on any assignment</h3>
              <p className="text-gray-500 mb-7 leading-relaxed">
                Post once, receive multiple bids from qualified writers. Compare profiles, ratings, and prices — then
                choose with confidence.
              </p>
              <ul className="flex flex-col gap-2.5 mb-8">
                {[
                  'All subjects from STEM to Humanities',
                  'Essays, reports, dissertations, and more',
                  'Secure escrow — pay only when satisfied',
                  'In-app chat with your chosen writer',
                  'Up to 3 free revisions included',
                  'Dispute resolution if something goes wrong',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-400">
                    <span className="w-[18px] h-[18px] rounded-full bg-indigo-500/20 flex-shrink-0 flex items-center justify-center mt-px">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 8 6.5 11.5 13 4.5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/sign-up?role=student"
                className="inline-block px-6 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition"
                style={{ boxShadow: '0 4px 24px rgba(99,102,241,0.35)' }}
              >
                Post your first order free
              </Link>
            </div>

            <div className="bg-[#111827] p-12">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6 bg-teal-500/10 text-teal-300 border border-teal-500/25">
                For Writers
              </div>
              <h3 className="text-2xl font-bold mb-3">Earn by doing what you do best</h3>
              <p className="text-gray-500 mb-7 leading-relaxed">
                Apply once, get approved, and start bidding on orders that match your expertise. Build your reputation
                and climb the leaderboard.
              </p>
              <ul className="flex flex-col gap-2.5 mb-8">
                {[
                  'Select subjects you specialise in',
                  'Set your own prices and deadlines',
                  'Earn points and unlock tier badges',
                  'Build a profile with sample work',
                  'Transparent earnings dashboard',
                  'Protected by platform dispute system',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-400">
                    <span className="w-[18px] h-[18px] rounded-full bg-teal-500/10 flex-shrink-0 flex items-center justify-center mt-px">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 8 6.5 11.5 13 4.5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/sign-up?role=writer"
                className="inline-block px-6 py-2.5 rounded-lg text-sm font-semibold transition"
                style={{
                  background: 'rgba(20,184,166,0.2)',
                  color: '#5eead4',
                  border: '1px solid rgba(20,184,166,0.3)',
                }}
              >
                Apply as a writer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <div className="bg-indigo-500/[0.07] border-y border-indigo-500/10 py-12 px-8">
        <div className="flex justify-center gap-16 flex-wrap max-w-4xl mx-auto">
          {[
            ['Escrow', 'Payments held until you approve'],
            ['Verified', 'Writers reviewed before approval'],
            ['Protected', 'Dispute resolution on every order'],
            ['Private', 'Watermarked previews, no leaks'],
          ].map(([num, label]) => (
            <div key={num} className="text-center">
              <div className="text-4xl font-bold tracking-tight">{num}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SAFETY */}
      <section id="safety" className="px-8 py-20 bg-[#0f1724]">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mt-14">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Buyer protection</div>
              <h2 className="text-4xl font-bold tracking-tight mb-4">Your money is safe — always</h2>
              <p className="text-lg text-gray-400 leading-relaxed mb-8">
                Funds never go directly to the writer. Everything passes through our escrow system, so you&apos;re
                protected at every step.
              </p>
              <div className="flex flex-col gap-6">
                {[
                  ['Escrow-held payments', 'Your payment is locked the moment you select a writer. It\'s only released when you click "Accept" — not before.'],
                  ['Revision protection', "Not happy? Request up to 3 free revisions before you're asked to make a final decision."],
                  ['Dispute resolution', "If you can't resolve things directly, open a dispute. Our team reviews the full chat log, files, and revision history to decide fairly."],
                ].map(([t, p]) => (
                  <div key={t}>
                    <h4 className="font-semibold text-white mb-1">{t}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              {[
                { icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>, bg: 'rgba(99,102,241,0.15)', stroke: '#818cf8', title: 'Payment captured', sub: 'Student selects writer, funds held' },
                { icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>, bg: 'rgba(234,179,8,0.12)', stroke: '#fde047', title: 'Work submitted', sub: 'Writer uploads, watermarked preview shown' },
                { icon: <polyline points="20 6 9 17 4 12" />, bg: 'rgba(34,197,94,0.12)', stroke: '#86efac', title: 'Student approves', sub: 'Payment released to writer after commission' },
                { icon: <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>, bg: 'rgba(239,68,68,0.12)', stroke: '#fca5a5', title: 'Dispute / Refund', sub: 'Admin reviews & decides outcome fairly' },
              ].map((s, i, arr) => (
                <div key={s.title}>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: s.bg }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {s.icon}
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{s.title}</div>
                      <div className="text-xs text-gray-500">{s.sub}</div>
                    </div>
                  </div>
                  {i < arr.length - 1 && <div className="text-center text-gray-700 text-lg my-1">↓</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="px-8 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">About us</div>
          <h2 className="text-4xl font-bold tracking-tight mb-5">Built to be fair to both sides</h2>
          <div className="flex flex-col gap-5 text-gray-400 leading-relaxed">
            <p>
              EduDesk is an academic writing marketplace built to solve a real problem: students struggle to find
              reliable, subject-qualified help, and skilled writers have no transparent platform to find work.
            </p>
            <p>
              We built EduDesk to fix that — with verified writers, escrow-protected payments, structured order
              workflows, and a dispute system that treats both parties fairly.
            </p>
            <p>
              This is a university project built with Next.js, PostgreSQL, and real-world architectural patterns — but
              designed to handle real users from day one.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="px-8 py-20 bg-[#0f1724]">
        <div className="max-w-lg mx-auto text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Get in touch</div>
          <h2 className="text-4xl font-bold tracking-tight mb-3">Contact us</h2>
          <p className="text-gray-500 mb-10">Have a question, feedback, or just want to say hello? We&apos;d love to hear from you.</p>
          <div className="flex flex-col gap-4 text-left">
            <input
              type="text"
              placeholder="Your name"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
            <input
              type="email"
              placeholder="Email address"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
            <textarea
              rows={4}
              placeholder="Your message…"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500 resize-none"
            />
            <button className="bg-indigo-500 hover:bg-indigo-400 py-3 rounded-lg font-semibold transition">
              Send message
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-8 border-t border-white/5">
        <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-sm font-bold text-gray-500">EduDesk</span>
          </Link>
          <div className="flex gap-8">
            {[
              ['#how-it-works', 'How it works'],
              ['#about', 'About'],
              ['#contact', 'Contact'],
              ['/auth/sign-in', 'Sign in'],
              ['/auth/sign-up', 'Sign up'],
            ].map(([href, label]) => (
              <a key={label} href={href} className="text-xs text-gray-600 hover:text-gray-400 transition">
                {label}
              </a>
            ))}
          </div>
          <div className="text-xs text-gray-700">© 2026 EduDesk. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
