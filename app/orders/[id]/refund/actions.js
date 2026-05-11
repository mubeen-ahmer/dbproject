'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';

const REFUNDABLE = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED'];

export async function requestRefund(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };
  if (user.role !== 'student') return { error: 'Only students can request refund' };

  const orderId = formData.get('order_id');
  if (!orderId) return { error: 'Missing order' };

  const guard = await pool.query(
    `SELECT student_id, status, selected_price FROM orders WHERE uuid = $1`,
    [orderId]
  );
  if (guard.rows.length === 0) return { error: 'Order not found' };
  const g = guard.rows[0];
  if (g.student_id !== user.uuid) return { error: 'Not your order' };
  if (!REFUNDABLE.includes(g.status)) {
    return { error: `Cannot refund when status is ${g.status}` };
  }
  if (!g.selected_price) return { error: 'Order has no payment to refund' };

  try {
    await pool.query(`CALL sp_request_refund($1)`, [orderId]);
  } catch (e) {
    return { error: e.message || 'Failed to refund' };
  }

  redirect(`/orders/${orderId}`);
}
