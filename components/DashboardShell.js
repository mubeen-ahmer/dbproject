'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/auth/sign-out/actions';

const ICONS = {
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  chart: (
    <>
      <polyline points="18 20 18 10" />
      <polyline points="12 20 12 4" />
      <polyline points="6 20 6 14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  dollar: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
};

function Icon({ name, size = 16, stroke = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

export const TierBadge = ({ label, variant = 'gold' }) => {
  const map = {
    gold: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
    teal: 'bg-teal-500/12 text-teal-300 border-teal-500/25',
    amber: 'bg-amber-700/20 text-amber-400 border-amber-700/30',
    gray: 'bg-gray-500/15 text-gray-300 border-gray-500/25',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    green: 'bg-green-500/12 text-green-300 border-green-500/25',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    red: 'bg-red-500/12 text-red-300 border-red-500/25',
    orange: 'bg-orange-500/12 text-orange-300 border-orange-500/25',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${map[variant] || map.gray}`}>
      {label}
    </span>
  );
};

function Avatar({ initials = '?', size = 32, gradient }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(${gradient || '135deg,#6366f1,#818cf8'})`,
        letterSpacing: '-0.02em',
      }}
    >
      {initials}
    </div>
  );
}

export default function DashboardShell({
  role = 'student',
  user,
  tier,
  nextTier,
  tenure,
  toNext,
  title,
  subtitle,
  unreadCount = 0,
  children,
}) {
  const pathname = usePathname();
  const isWriter = role === 'writer';
  const accentActive = isWriter ? 'bg-teal-500/12 border-teal-500/25 text-teal-300' : 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400';
  const accentGrad = isWriter ? 'linear-gradient(90deg,#14b8a6,#5eead4)' : 'linear-gradient(90deg,#6366f1,#818cf8)';
  const accentAvatar = isWriter ? '135deg,#14b8a6,#5eead4' : '135deg,#6366f1,#818cf8';
  const userCardStyle = isWriter ? 'bg-teal-500/10 border-teal-500/20' : 'bg-indigo-500/12 border-indigo-500/20';

  const nav = isWriter
    ? [
        { id: 'home', href: '/dashboard/writer', label: 'Overview', icon: 'home' },
        { id: 'browse', href: '/orders/pool', label: 'Browse Orders', icon: 'search' },
        { id: 'my-orders', href: '/orders/my', label: 'My Orders', icon: 'file' },
        { id: 'earnings', href: '/payments', label: 'Earnings', icon: 'dollar' },
        { id: 'notifications', href: '/notifications', label: 'Notifications', icon: 'bell', badge: unreadCount },
        { id: 'leaderboard', href: '/leaderboard', label: 'Leaderboard', icon: 'chart' },
      ]
    : [
        { id: 'home', href: '/dashboard/student', label: 'Overview', icon: 'home' },
        { id: 'new-order', href: '/orders/new', label: 'New Order', icon: 'plus' },
        { id: 'my-orders', href: '/orders/my', label: 'My Orders', icon: 'file' },
        { id: 'notifications', href: '/notifications', label: 'Notifications', icon: 'bell', badge: unreadCount },
        { id: 'leaderboard', href: '/leaderboard', label: 'Leaderboard', icon: 'chart' },
      ];

  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const percent = nextTier && toNext >= 0 ? Math.min(100, Math.max(0, ((nextTier.min - toNext - (tier?.min || 0)) / ((nextTier.min) - (tier?.min || 0))) * 100)) : 100;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1724] text-white">
      {/* Sidebar */}
      <aside
        className="w-56 flex flex-col flex-shrink-0 border-r"
        style={{ background: '#0a0f1a', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="px-4 pt-5 pb-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-[13px]"
              style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}
            >
              Ed
            </div>
            <span className="text-base font-bold">EduDesk</span>
          </Link>
          <div className={`mt-3 px-2.5 py-2 rounded-lg border ${userCardStyle}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {isWriter ? 'Writer' : 'Signed in as'}
            </div>
            <div className="text-xs font-semibold mt-0.5 truncate">{user?.name || 'Unknown'}</div>
            {tier && tenure && (
              <div className="flex gap-1 mt-1">
                <TierBadge label={tier.label} variant={tierColor(tier.label)} />
                <TierBadge label={tenure.label} variant={tenureColor(tenure.label)} />
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
          {nav.map((n) => {
            const active = n.href === pathname;
            return (
              <Link
                key={n.id}
                href={n.href}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition border ${
                  active
                    ? `${accentActive} font-semibold`
                    : 'text-gray-500 hover:bg-white/[0.04] border-transparent font-medium'
                }`}
              >
                <Icon name={n.icon} size={16} />
                <span className="flex-1">{n.label}</span>
                {n.badge > 0 && (
                  <span
                    className="rounded-full text-[10px] font-bold px-1.5 min-w-[18px] text-center text-white"
                    style={{ background: isWriter ? '#14b8a6' : '#6366f1' }}
                  >
                    {n.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Points bar */}
        {tier && (
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-gray-500 font-medium">
                {user?.point || 0} pts · {tier.label}
              </span>
              {nextTier && (
                <span className="text-gray-500">
                  {toNext} to {nextTier.label}
                </span>
              )}
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${percent}%`, background: accentGrad }} />
            </div>
          </div>
        )}

        <form action={signOut} className="px-2 pb-3">
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-red-500/10 hover:text-red-300 transition"
          >
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </form>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="h-[58px] flex items-center justify-between px-6 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div>
            <div className="text-[15px] font-bold tracking-tight">{title}</div>
            {subtitle && <div className="text-[11px] text-gray-500 mt-px">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="font-mono text-[11px] text-gray-500 rounded-md px-2.5 py-0.5 border"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <Avatar initials={initials} size={32} gradient={accentAvatar} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function tierColor(label) {
  const map = {
    Bronze: 'amber',
    Silver: 'gray',
    Gold: 'gold',
    Platinum: 'teal',
    Elite: 'purple',
  };
  return map[label] || 'gray';
}

function tenureColor(label) {
  const map = {
    Veteran: 'indigo',
    'Half Year': 'teal',
    Quarterly: 'green',
    '1 Month': 'blue',
    New: 'gray',
  };
  return map[label] || 'gray';
}
