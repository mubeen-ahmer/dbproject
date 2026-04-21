import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import RevisionForm from './RevisionForm';

export const dynamic = 'force-dynamic';

export default async function RevisionRequestPage({ params }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'student') redirect('/');

  const orderRes = await pool.query(
    `SELECT uuid, title, status, student_id FROM orders WHERE uuid = $1`,
    [id]
  );
  if (orderRes.rows.length === 0) notFound();
  const order = orderRes.rows[0];

  if (order.student_id !== user.uuid) redirect('/');
  if (order.status !== 'SUBMITTED') redirect(`/orders/${id}`);

  const latestSub = await pool.query(
    `SELECT uuid, count FROM submission
     WHERE order_id = $1
     ORDER BY count DESC LIMIT 1`,
    [id]
  );
  if (latestSub.rows.length === 0) redirect(`/orders/${id}`);

  const revCount = await pool.query(
    `SELECT COUNT(*) AS c FROM revision WHERE order_id = $1`,
    [id]
  );
  const used = Number(revCount.rows[0].c);

  if (used >= 3) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <Link href={`/orders/${id}`} className="text-indigo-400 hover:underline text-sm">
          ← Back to order
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-2">Max Revisions Reached</h1>
        <p className="text-gray-400 text-sm">
          You've already used all 3 revision requests for this order.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href={`/orders/${id}`} className="text-indigo-400 hover:underline text-sm">
        ← Back to order
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">Request Revision</h1>
      <p className="text-gray-400 text-sm mb-6">
        {order.title} · Revision {used + 1} of 3
      </p>

      <RevisionForm orderId={id} submissionId={latestSub.rows[0].uuid} />
    </div>
  );
}
