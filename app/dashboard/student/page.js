import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import DashboardShell from '@/components/DashboardShell';
import { getTier, nextTier as getNextTier, getTenure } from '@/lib/badges';

export const dynamic = 'force-dynamic';

const STATUS_BADGE = {
  OPEN: ['bg-blue-500/15 text-blue-300 border-blue-500/25', 'BIDDING'],
  BIDDING: ['bg-blue-500/15 text-blue-300 border-blue-500/25', 'BIDDING'],
  ASSIGNED: ['bg-indigo-500/15 text-indigo-300 border-indigo-500/25', 'ASSIGNED'],
  IN_PROGRESS: ['bg-indigo-500/15 text-indigo-300 border-indigo-500/25', 'IN PROGRESS'],
  UNDER_REVIEW: ['bg-yellow-500/15 text-yellow-300 border-yellow-500/25', 'UNDER REVIEW'],
  SUBMITTED: ['bg-yellow-500/15 text-yellow-300 border-yellow-500/25', 'SUBMITTED'],
  REVISION_REQUESTED: ['bg-orange-500/12 text-orange-300 border-orange-500/25', 'REVISION'],
  COMPLETED: ['bg-green-500/12 text-green-300 border-green-500/25', 'COMPLETED'],
  DISPUTED: ['bg-red-500/12 text-red-300 border-red-500/25', 'DISPUTED'],
  CANCELLED: ['bg-gray-500/15 text-gray-300 border-gray-500/25', 'CANCELLED'],
  REFUNDED: ['bg-gray-500/15 text-gray-300 border-gray-500/25', 'REFUNDED'],
};

function StatusBadge({ status }) {
  const [cls, label] = STATUS_BADGE[status] || ['bg-gray-500/15 text-gray-300 border-gray-500/25', status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, sub, accent = 'indigo', icon }) {
  const colors = {
    indigo: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.2)', stroke: '#a5b4fc' },
    teal: { bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.2)', stroke: '#5eead4' },
    green: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.2)', stroke: '#86efac' },
    amber: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', stroke: '#fcd34d' },
  };
  const c = colors[accent] || colors.indigo;
  return (
    <div
      className="rounded-xl border p-5 flex-1 min-w-[150px]"
      style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center border"
          style={{ background: c.bg, borderColor: c.border }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </div>
      </div>
      <div className="text-[1.6rem] font-bold tracking-tight leading-none">{value}</div>
      <div className="text-[11px] text-gray-500 mt-1.5">{sub}</div>
    </div>
  );
}

export default async function StudentDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'student') redirect('/');

  const tier = getTier(user.point);
  const next = getNextTier(user.point);
  const tenure = getTenure(user.created_at);
  const toNext = next ? next.min - user.point : 0;

  // Stats: active orders, bids received, completed, notifications
  const ordersResult = await pool.query(
    `SELECT o.uuid, o.title, o.status, o.pages,
            o.minimum_price, o.selected_price, o.deadline_offered,
            s.name AS subject_name
       FROM orders o
       JOIN subject s ON s.uuid = o.subject_id
      WHERE o.student_id = $1
      ORDER BY o.created_at DESC
      LIMIT 20`,
    [user.uuid]
  );
  const orders = ordersResult.rows;
  const active = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status));
  const completed = orders.filter((o) => o.status === 'COMPLETED').length;

  let bidsReceived = 0;
  if (active.length > 0) {
    const bidCountResult = await pool.query(
      `SELECT COUNT(*)::int AS n FROM bid WHERE order_id = ANY($1::uuid[])`,
      [active.map((o) => o.uuid)]
    );
    bidsReceived = bidCountResult.rows[0]?.n || 0;
  }

  const notifsResult = await pool.query(
    `SELECT uuid, order_id, type, text, read_at, created_at
       FROM notification
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5`,
    [user.uuid]
  );
  const notifs = notifsResult.rows;
  const unreadCount = notifs.filter((n) => !n.read_at).length;

  return (
    <DashboardShell
      role="student"
      user={user}
      tier={tier}
      nextTier={next}
      tenure={tenure}
      toNext={toNext}
      title="Overview"
      subtitle={`Welcome back, ${user.name?.split(' ')[0] || 'there'}`}
      unreadCount={unreadCount}
    >
      <div className="p-6">
        {/* Stats */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <StatCard
            label="Active Orders"
            value={active.length}
            sub={active.length === 0 ? 'No active orders' : `${active.length} in progress`}
            accent="indigo"
            icon={
              <>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </>
            }
          />
          <StatCard
            label="Bids Received"
            value={bidsReceived}
            sub={`on ${active.length} active ${active.length === 1 ? 'order' : 'orders'}`}
            accent="teal"
            icon={
              <>
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
              </>
            }
          />
          <StatCard
            label="Completed"
            value={completed}
            sub="All time"
            accent="green"
            icon={<polyline points="20 6 9 17 4 12" />}
          />
          <StatCard
            label="Points"
            value={user.point || 0}
            sub={next ? `${tier.label} · ${toNext} to ${next.label}` : `${tier.label} tier`}
            accent="amber"
            icon={<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
          {/* Active Orders */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="text-[13px] font-bold">Active Orders</div>
              <Link href="/orders/my" className="text-xs font-semibold text-indigo-500 hover:text-indigo-400">
                View all →
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {active.length === 0 ? (
                <div className="rounded-xl border p-8 text-center text-gray-500 text-sm" style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}>
                  No active orders. <Link href="/orders/new" className="text-indigo-400 hover:underline">Post your first one.</Link>
                </div>
              ) : (
                active.slice(0, 4).map((o) => (
                  <Link
                    key={o.uuid}
                    href={`/orders/${o.uuid}`}
                    className="rounded-xl border p-4 transition hover:bg-[#182235]"
                    style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="text-[13px] font-semibold truncate mb-0.5">{o.title}</div>
                        <div className="text-[11px] text-gray-500">
                          {o.subject_name} · {o.pages} {o.pages === 1 ? 'page' : 'pages'}
                        </div>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-500">
                        Due {new Date(o.deadline_offered).toLocaleDateString()}
                      </span>
                      <span className="text-[13px] font-bold">
                        ${Number(o.selected_price || o.minimum_price).toFixed(0)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border p-4" style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-xs font-bold text-gray-400 mb-3">Quick Actions</div>
              <div className="flex flex-col gap-1.5">
                {[
                  ['Post a new order', 'Get bids from writers', '/orders/new', '#6366f1'],
                  ['My orders', `${orders.length} total`, '/orders/my', '#22c55e'],
                  ['Leaderboard', 'See your rank', '/leaderboard', '#f59e0b'],
                ].map(([l, sub, href, color]) => (
                  <Link
                    key={l}
                    href={href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition hover:border-white/15"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div>
                      <div className="text-xs font-semibold">{l}</div>
                      <div className="text-[10px] text-gray-500">{sub}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-xs font-bold text-gray-400 mb-3">Latest Notifications</div>
              <div className="flex flex-col gap-2">
                {notifs.length === 0 ? (
                  <div className="text-[11px] text-gray-500">No notifications yet.</div>
                ) : (
                  notifs.slice(0, 3).map((n) => (
                    <div key={n.uuid} className="flex gap-2 items-start">
                      {!n.read_at ? (
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0 mt-1.5" />
                      ) : (
                        <div className="w-1.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-[11px] leading-relaxed ${n.read_at ? 'text-gray-500' : 'text-gray-400'}`}>
                          {n.text}
                        </div>
                        <div className="text-[10px] text-gray-700 mt-0.5">
                          {new Date(n.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {notifs.length > 0 && (
                  <Link href="/notifications" className="text-[11px] text-indigo-400 hover:text-indigo-300 mt-1">
                    View all notifications →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
