import pool from '@/lib/db';
import Link from 'next/link';
import UserBadges from '@/components/UserBadges';
import { getCurrentUser } from '@/lib/auth/user';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  const result = await pool.query(
    `SELECT writer_id, name, point, created_at, tier, tenure_badge,
            completed_orders, avg_rating
     FROM v_writer_leaderboard
     LIMIT 50`
  );
  const rows = result.rows;

  const backHref = user
    ? user.role === 'admin'
      ? '/dashboard/admin'
      : user.role === 'writer'
        ? '/dashboard/writer'
        : '/dashboard/student'
    : '/';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="mb-6">
        <Link href={backHref} className="text-indigo-400 hover:underline text-sm">
          ← Back
        </Link>
        <h1 className="text-3xl font-bold mt-2">Writer Leaderboard</h1>
        <p className="text-gray-400 text-sm mt-1">Top writers by points earned</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-gray-500 text-center py-16">No approved writers yet.</div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Writer</th>
                <th className="px-4 py-3 text-left">Badges</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 text-right">Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.writer_id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-gray-500">#{i + 1}</td>
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3">
                    <UserBadges points={r.point} createdAt={r.created_at} />
                  </td>
                  <td className="px-4 py-3 text-right">{r.point}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{r.completed_orders}</td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {r.avg_rating ? Number(r.avg_rating).toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
