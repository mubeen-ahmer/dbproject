import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUS_STYLES = {
  HELD: 'bg-yellow-500/20 text-yellow-300',
  RELEASED_TO_WRITER: 'bg-green-500/20 text-green-300',
  REFUNDED: 'bg-blue-500/20 text-blue-300',
  SPLIT: 'bg-purple-500/20 text-purple-300',
};

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role === 'student') redirect('/dashboard/student');

  const isAdmin = user.role === 'admin';
  const isWriter = user.role === 'writer';

  let transactions = [];
  let summary = null;

  if (isAdmin) {
    const res = await pool.query(
      `SELECT t.uuid, t.order_id, t.status, t.amount, t.received_date, t.release_date,
              o.title AS order_title, o.selected_price,
              stu.name AS student_name,
              wr_user.name AS writer_name
       FROM transactions t
       JOIN orders o ON o.uuid = t.order_id
       JOIN neon_auth."user" stu ON stu.id = o.student_id
       LEFT JOIN neon_auth."user" wr_user ON wr_user.id = o.writer_id
       ORDER BY t.received_date DESC`
    );
    transactions = res.rows;

    const sumRes = await pool.query(
      `SELECT status, COUNT(*) AS count, SUM(amount) AS total
       FROM transactions GROUP BY status`
    );
    summary = sumRes.rows;
  } else if (isWriter) {
    const res = await pool.query(
      `SELECT t.uuid, t.order_id, t.status, t.amount, t.received_date, t.release_date,
              o.title AS order_title, o.selected_price,
              stu.name AS student_name
       FROM transactions t
       JOIN orders o ON o.uuid = t.order_id
       JOIN neon_auth."user" stu ON stu.id = o.student_id
       WHERE o.writer_id = $1 AND t.status = 'RELEASED_TO_WRITER'
       ORDER BY t.received_date DESC`,
      [user.uuid]
    );
    transactions = res.rows;
  }

  const totalEarnings = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const dashboardPath = isAdmin ? '/dashboard/admin' : '/dashboard/writer';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href={dashboardPath} className="text-indigo-400 hover:underline text-sm">
        ← Dashboard
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-6">
        {isAdmin ? 'All Payments' : 'My Earnings'}
      </h1>

      {isAdmin && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {summary.map((s) => (
            <div
              key={s.status}
              className="bg-white/5 border border-white/10 rounded-lg p-4"
            >
              <div className={`inline-block text-xs px-2 py-0.5 rounded mb-2 ${STATUS_STYLES[s.status] || 'bg-gray-500/20 text-gray-300'}`}>
                {s.status}
              </div>
              <div className="text-2xl font-bold">${Number(s.total).toFixed(2)}</div>
              <div className="text-xs text-gray-500">{s.count} transaction{Number(s.count) === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
      )}

      {isWriter && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-6">
          <div className="text-sm text-gray-400 uppercase">Total Earned</div>
          <div className="text-4xl font-bold text-green-400 mt-1">
            ${totalEarnings.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Across {transactions.length} completed order{transactions.length === 1 ? '' : 's'}
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="text-gray-500 text-center py-16">
          No transactions yet.
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Order</th>
                {isAdmin && <th className="text-left px-4 py-3">Student</th>}
                {isAdmin && <th className="text-left px-4 py-3">Writer</th>}
                {!isAdmin && <th className="text-left px-4 py-3">Student</th>}
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((t) => (
                <tr key={t.uuid} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${t.order_id}`}
                      className="text-indigo-400 hover:underline"
                    >
                      {t.order_title}
                    </Link>
                  </td>
                  {isAdmin && <td className="px-4 py-3 text-gray-300">{t.student_name}</td>}
                  {isAdmin && <td className="px-4 py-3 text-gray-300">{t.writer_name || '—'}</td>}
                  {!isAdmin && <td className="px-4 py-3 text-gray-300">{t.student_name}</td>}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[t.status] || 'bg-gray-500/20 text-gray-300'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${Number(t.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(t.release_date || t.received_date).toLocaleString()}
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
