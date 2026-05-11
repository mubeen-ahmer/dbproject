import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import SubmitForm from './SubmitForm';

export const dynamic = 'force-dynamic';

const ALLOWED = ['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'];

export default async function SubmitPage({ params }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'writer') redirect('/');

  const orderRes = await pool.query(
    `SELECT uuid, title, status, writer_id FROM orders WHERE uuid = $1`,
    [id]
  );
  if (orderRes.rows.length === 0) notFound();
  const order = orderRes.rows[0];

  if (order.writer_id !== user.uuid) redirect(`/orders/${id}`);
  if (!ALLOWED.includes(order.status)) redirect(`/orders/${id}`);

  const countRes = await pool.query(
    `SELECT COUNT(*) AS c FROM submission WHERE order_id = $1`,
    [id]
  );
  const nextCount = Number(countRes.rows[0].c) + 1;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href={`/orders/${id}`} className="text-indigo-400 hover:underline text-sm">
        ← Back to order
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">
        Submit Work {nextCount > 1 ? `(Revision #${nextCount - 1})` : ''}
      </h1>
      <p className="text-gray-400 text-sm mb-6">{order.title}</p>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-sm mb-6 max-w-xl">
        <strong>Stub mode:</strong> real file upload + watermarking not wired yet. Paste any path strings for now — they're stored as-is. Replace with UploadThing when ready.
      </div>

      <SubmitForm orderId={id} />
    </div>
  );
}
