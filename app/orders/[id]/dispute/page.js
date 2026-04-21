import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import DisputeForm from './DisputeForm';

export const dynamic = 'force-dynamic';

export default async function DisputePage({ params }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const res = await pool.query(
    `SELECT uuid, title, status, student_id, writer_id FROM orders WHERE uuid = $1`,
    [id]
  );
  if (res.rows.length === 0) notFound();
  const order = res.rows[0];

  const isStudent = user.role === 'student' && user.uuid === order.student_id;
  const isAssignedWriter = user.role === 'writer' && user.uuid === order.writer_id;
  if (!isStudent && !isAssignedWriter) redirect('/');

  const allowed = ['SUBMITTED', 'REVISION_REQUESTED', 'ASSIGNED', 'IN_PROGRESS'];
  if (!allowed.includes(order.status)) redirect(`/orders/${id}`);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href={`/orders/${id}`} className="text-indigo-400 hover:underline text-sm">
        ← Back to order
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">Raise a Dispute</h1>
      <p className="text-gray-400 text-sm mb-6">{order.title}</p>

      <div className="max-w-lg space-y-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4 text-sm text-yellow-200">
          Raising a dispute will pause this order and flag it for admin review.
          Describe the issue clearly — the admin will decide whether to complete or refund the order.
        </div>

        <DisputeForm orderId={id} />
      </div>
    </div>
  );
}
