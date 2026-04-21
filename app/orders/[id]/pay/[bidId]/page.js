import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import PaymentForm from './PaymentForm';

export const dynamic = 'force-dynamic';

export default async function PaymentPage({ params }) {
  const { id, bidId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'student') redirect('/');

  const res = await pool.query(
    `SELECT
       o.uuid AS order_id, o.title, o.status AS order_status, o.student_id,
       o.minimum_price,
       b.uuid AS bid_id, b.offered_price, b.offered_deadline, b.status AS bid_status,
       wr_user.name AS writer_name
     FROM bid b
     JOIN orders o ON o.uuid = b.order_id
     JOIN users wr_user ON wr_user.uuid = b.writer_id
     WHERE b.uuid = $1 AND o.uuid = $2`,
    [bidId, id]
  );

  if (res.rows.length === 0) notFound();
  const info = res.rows[0];

  if (info.student_id !== user.uuid) redirect('/');
  if (!['OPEN', 'BIDDING'].includes(info.order_status)) redirect(`/orders/${id}`);
  if (info.bid_status !== 'PENDING') redirect(`/orders/${id}`);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href={`/orders/${id}`} className="text-indigo-400 hover:underline text-sm">
        ← Back to order
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">Confirm & Pay</h1>
      <p className="text-gray-400 text-sm mb-6">
        Payment is simulated — no real card is charged. Funds go into escrow and release to the writer on acceptance.
      </p>

      <div className="max-w-md space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-sm">
          <Row label="Order" value={info.title} />
          <Row label="Writer" value={info.writer_name} />
          <Row
            label="Delivery by"
            value={new Date(info.offered_deadline).toLocaleString()}
          />
          <Row
            label="Amount"
            value={<span className="font-semibold text-lg">${Number(info.offered_price).toFixed(2)}</span>}
          />
        </div>

        <PaymentForm orderId={id} bidId={bidId} amount={Number(info.offered_price)} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}
