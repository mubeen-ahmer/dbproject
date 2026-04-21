import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { resolveForWriter, resolveForStudent } from './actions';

export const dynamic = 'force-dynamic';

export default async function DisputesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'admin') redirect('/');

  const res = await pool.query(
    `SELECT
       o.uuid, o.title, o.status, o.selected_price, o.created_at,
       stu.name AS student_name,
       wri.name AS writer_name,
       sub.name AS subject_name,
       srv.name AS service_name,
       (SELECT COUNT(*) FROM submission WHERE order_id = o.uuid) AS sub_count
     FROM orders o
     JOIN users stu ON stu.uuid = o.student_id
     LEFT JOIN users wri ON wri.uuid = o.writer_id
     JOIN subject sub ON sub.uuid = o.subject_id
     JOIN service srv ON srv.uuid = o.service_id
     WHERE o.status = 'DISPUTED'
     ORDER BY o.created_at DESC`
  );
  const disputes = res.rows;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/dashboard/admin" className="text-indigo-400 hover:underline text-sm">
            ← Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-2">Disputes</h1>
          <p className="text-gray-400 text-sm mt-1">
            {disputes.length} open {disputes.length === 1 ? 'dispute' : 'disputes'}
          </p>
        </div>
        <LogoutButton />
      </div>

      {disputes.length === 0 ? (
        <div className="text-gray-500 text-center py-16">No open disputes.</div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div key={d.uuid} className="border border-yellow-500/30 rounded-lg p-6 bg-yellow-500/5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Link
                    href={`/orders/${d.uuid}`}
                    className="text-xl font-semibold text-indigo-400 hover:underline"
                  >
                    {d.title}
                  </Link>
                  <p className="text-gray-400 text-sm mt-1">
                    {d.subject_name} · {d.service_name}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Raised {new Date(d.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded font-medium">
                  DISPUTED
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-0.5">Student</div>
                  <div>{d.student_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-0.5">Writer</div>
                  <div>{d.writer_name || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-0.5">Agreed Price</div>
                  <div>{d.selected_price ? `$${Number(d.selected_price).toFixed(2)}` : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-0.5">Submissions</div>
                  <div>{Number(d.sub_count)}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <form action={resolveForWriter}>
                  <input type="hidden" name="order_id" value={d.uuid} />
                  <button
                    type="submit"
                    disabled={!d.selected_price}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-40 px-4 py-2 rounded text-sm"
                  >
                    Resolve → Writer wins
                  </button>
                </form>
                <form action={resolveForStudent}>
                  <input type="hidden" name="order_id" value={d.uuid} />
                  <button
                    type="submit"
                    disabled={!d.selected_price}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 rounded text-sm"
                  >
                    Resolve → Student refunded
                  </button>
                </form>
                <Link
                  href={`/orders/${d.uuid}`}
                  className="border border-white/20 hover:bg-white/5 px-4 py-2 rounded text-sm"
                >
                  View full order →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
