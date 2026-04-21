import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import RefundConfirm from './RefundConfirm';

export const dynamic = 'force-dynamic';

const REFUNDABLE = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED'];

const SPLITS = {
  0: { student: 0.70, writer: 0.25, platform: 0.05 },
  1: { student: 0.50, writer: 0.40, platform: 0.10 },
  2: { student: 0.30, writer: 0.60, platform: 0.10 },
};

export default async function RefundPage({ params }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'student') redirect('/');

  const [orderRes, subRes] = await Promise.all([
    pool.query(
      `SELECT o.uuid, o.title, o.status, o.student_id, o.selected_price,
              wr_user.name AS writer_name
       FROM orders o
       LEFT JOIN users wr_user ON wr_user.uuid = o.writer_id
       WHERE o.uuid = $1`,
      [id]
    ),
    pool.query(
      `SELECT COUNT(*) AS c FROM submission WHERE order_id = $1`,
      [id]
    ),
  ]);

  if (orderRes.rows.length === 0) notFound();
  const order = orderRes.rows[0];
  const subCount = Number(subRes.rows[0].c);

  if (order.student_id !== user.uuid) redirect('/');
  if (!REFUNDABLE.includes(order.status)) redirect(`/orders/${id}`);
  if (!order.selected_price) redirect(`/orders/${id}`);

  const price = Number(order.selected_price);

  if (subCount >= 3) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <Link href={`/orders/${id}`} className="text-indigo-400 hover:underline text-sm">
          ← Back to order
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-2">Refund Not Available</h1>
        <p className="text-gray-400 text-sm max-w-md">
          After 3 submissions, refunds are locked. You can still request more revisions
          (if available) or accept the current submission to complete the order.
        </p>
      </div>
    );
  }

  const split = SPLITS[subCount];
  const studentShare = price * split.student;
  const writerShare = price * split.writer;
  const platformShare = price * split.platform;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href={`/orders/${id}`} className="text-indigo-400 hover:underline text-sm">
        ← Back to order
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">Request Refund</h1>
      <p className="text-gray-400 text-sm mb-6">{order.title}</p>

      <div className="max-w-md space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-sm">
          <strong className="text-red-300">Warning:</strong> Split depends on how much
          work the writer has done. You're at <strong>{subCount} submission{subCount === 1 ? '' : 's'}</strong>.
          Refund moves the order to <strong>REFUNDED</strong> and reviews are disabled.
        </div>

        <div className="text-xs text-gray-500">
          Split rule: 0 subs = 70/25/5 · 1 sub = 50/40/10 · 2 subs = 30/60/10 · 3+ = no refund
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Paid amount</span>
            <span>${price.toFixed(2)}</span>
          </div>
          <div className="border-t border-white/10 my-2" />
          <div className="flex justify-between">
            <span className="text-gray-400">You get back ({(split.student * 100).toFixed(0)}%)</span>
            <span className="text-green-400">${studentShare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Writer keeps ({(split.writer * 100).toFixed(0)}%)</span>
            <span>${writerShare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Platform fee ({(split.platform * 100).toFixed(0)}%)</span>
            <span>${platformShare.toFixed(2)}</span>
          </div>
        </div>

        <RefundConfirm orderId={id} />
      </div>
    </div>
  );
}
