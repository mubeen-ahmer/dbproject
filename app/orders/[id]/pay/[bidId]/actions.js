'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';

export async function confirmPayment(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };
  if (user.role !== 'student') return { error: 'Only students can accept bids' };

  const orderId = formData.get('order_id');
  const bidId = formData.get('bid_id');

  if (!orderId || !bidId) return { error: 'Missing order or bid' };

  const guard = await pool.query(
    `SELECT o.student_id, o.status AS order_status, b.status AS bid_status, b.offered_price
     FROM bid b
     JOIN orders o ON o.uuid = b.order_id
     WHERE b.uuid = $1 AND o.uuid = $2`,
    [bidId, orderId]
  );

  if (guard.rows.length === 0) return { error: 'Bid not found' };
  const g = guard.rows[0];
  if (g.student_id !== user.uuid) return { error: 'Not your order' };
  if (!['OPEN', 'BIDDING'].includes(g.order_status)) {
    return { error: 'Order is no longer accepting bids' };
  }
  if (g.bid_status !== 'PENDING') return { error: 'Bid is not pending' };

  try {
    await pool.query(
      `UPDATE bid SET status = 'ACCEPTED' WHERE uuid = $1`,
      [bidId]
    );

    await pool.query(
      `INSERT INTO transactions (order_id, status, amount)
       VALUES ($1, 'HELD', $2)`,
      [orderId, g.offered_price]
    );
  } catch (e) {
    return { error: e.message || 'Payment failed' };
  }

  redirect(`/orders/${orderId}`);
}
