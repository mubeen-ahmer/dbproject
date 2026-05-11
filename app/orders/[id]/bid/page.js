import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import BidForm from './BidForm';

export const dynamic = 'force-dynamic';

export default async function BidPage({ params }) {
  const { id } = await params;

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

  const orderRes = await pool.query(
    `SELECT o.uuid, o.title, o.status, o.pages, o.minimum_price,
            o.deadline_offered, o.student_id,
            s.name AS subject_name, sv.name AS service_name
     FROM orders o
     JOIN subject s ON s.uuid = o.subject_id
     JOIN service sv ON sv.uuid = o.service_id
     WHERE o.uuid = $1`,
    [id]
  );

  if (orderRes.rows.length === 0) notFound();
  const order = orderRes.rows[0];

  if (!['OPEN', 'BIDDING'].includes(order.status)) {
    redirect(`/orders/${id}`);
  }
  if (order.student_id === user.uuid) redirect(`/orders/${id}`);

  const existing = await pool.query(
    `SELECT uuid FROM bid WHERE order_id = $1 AND writer_id = $2`,
    [id, user.uuid]
  );
  if (existing.rows.length > 0) redirect(`/orders/${id}`);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href={`/orders/${id}`} className="text-indigo-400 hover:underline text-sm">
        ← Back to order
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">Place Bid</h1>
      <p className="text-gray-400 text-sm mb-6">
        {order.title} · {order.subject_name} · {order.service_name} · {order.pages} pages
      </p>

      <BidForm
        orderId={id}
        minimumPrice={Number(order.minimum_price)}
        studentDeadline={order.deadline_offered}
      />
    </div>
  );
}
