import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import OrderStatusBadge from '@/components/OrderStatusBadge';

export const dynamic = 'force-dynamic';

export default async function OrderPoolPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'writer') redirect('/');

  const writerCheck = await pool.query(
    `SELECT status FROM writer WHERE id = $1`,
    [user.uuid]
  );
  if (writerCheck.rows.length === 0 || writerCheck.rows[0].status !== 'APPROVED') {
    redirect('/application-status');
  }

  const result = await pool.query(
    `SELECT
       o.uuid, o.title, o.status, o.pages,
       o.minimum_price, o.deadline_offered, o.created_at,
       o.academic_level, o.citation_style,
       s.name AS subject_name,
       sv.name AS service_name,
       (SELECT COUNT(*) FROM bid b WHERE b.order_id = o.uuid) AS bid_count,
       EXISTS (
         SELECT 1 FROM bid b
         WHERE b.order_id = o.uuid AND b.writer_id = $1
       ) AS already_bid
     FROM orders o
     JOIN subject s ON s.uuid = o.subject_id
     JOIN service sv ON sv.uuid = o.service_id
     WHERE o.status IN ('OPEN', 'BIDDING')
       AND EXISTS (
         SELECT 1 FROM writer_subject ws
         WHERE ws.writer_id = $1 AND ws.subject_id = o.subject_id
       )
       AND EXISTS (
         SELECT 1 FROM writer_service wsv
         WHERE wsv.writer_id = $1 AND wsv.service_id = o.service_id
       )
     ORDER BY o.created_at DESC`,
    [user.uuid]
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href="/dashboard/writer" className="text-indigo-400 hover:underline text-sm">
        ← Dashboard
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">Order Pool</h1>
      <p className="text-gray-400 text-sm mb-6">
        Orders matching your subjects and services.
      </p>

      {result.rows.length === 0 ? (
        <div className="text-gray-500 text-center py-16">
          No matching orders right now. Check back later.
        </div>
      ) : (
        <div className="space-y-3">
          {result.rows.map((o) => (
            <Link
              key={o.uuid}
              href={`/orders/${o.uuid}`}
              className="block border border-white/10 rounded-lg p-4 bg-white/5 hover:bg-white/10"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-semibold">{o.title}</h2>
                <div className="flex gap-2 items-center">
                  {o.already_bid && (
                    <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">
                      You bid
                    </span>
                  )}
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
              <div className="text-sm text-gray-400 grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>{o.subject_name}</div>
                <div>{o.service_name}</div>
                <div>{o.pages} page{o.pages > 1 ? 's' : ''}</div>
                <div>min ${Number(o.minimum_price).toFixed(2)}</div>
                <div>{o.bid_count} bid{Number(o.bid_count) === 1 ? '' : 's'}</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Deadline: {new Date(o.deadline_offered).toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
