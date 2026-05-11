import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import OrderStatusBadge from '@/components/OrderStatusBadge';

export const dynamic = 'force-dynamic';

export default async function MyOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role === 'admin') redirect('/dashboard/admin');

  const whereClause =
    user.role === 'student' ? 'o.student_id = $1' : 'o.writer_id = $1';

  const result = await pool.query(
    `SELECT
       o.uuid, o.title, o.status, o.pages,
       o.minimum_price, o.selected_price,
       o.deadline_offered, o.created_at,
       s.name AS subject_name,
       sv.name AS service_name
     FROM orders o
     JOIN subject s ON s.uuid = o.subject_id
     JOIN service sv ON sv.uuid = o.service_id
     WHERE ${whereClause}
     ORDER BY o.created_at DESC`,
    [user.uuid]
  );

  const dashboardPath = user.role === 'student' ? '/dashboard/student' : '/dashboard/writer';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href={dashboardPath} className="text-indigo-400 hover:underline text-sm">
        ← Dashboard
      </Link>
      <div className="flex justify-between items-center mt-2 mb-6">
        <h1 className="text-3xl font-bold">My Orders</h1>
        {user.role === 'student' && (
          <Link
            href="/orders/new"
            className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded text-sm"
          >
            + New Order
          </Link>
        )}
      </div>

      {result.rows.length === 0 ? (
        <div className="text-gray-500 text-center py-16">
          {user.role === 'student'
            ? 'No orders yet. Create your first one.'
            : 'No assigned orders yet. Browse the pool to place bids.'}
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
                <OrderStatusBadge status={o.status} />
              </div>
              <div className="text-sm text-gray-400 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>{o.subject_name}</div>
                <div>{o.service_name}</div>
                <div>{o.pages} page{o.pages > 1 ? 's' : ''}</div>
                <div>
                  {o.selected_price
                    ? `$${Number(o.selected_price).toFixed(2)}`
                    : `min $${Number(o.minimum_price).toFixed(2)}`}
                </div>
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
