'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';

export async function raiseDispute(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };

  const orderId = formData.get('order_id');
  const reason = formData.get('reason')?.trim();

  if (!reason || reason.length < 20) {
    return { error: 'Please describe the issue (at least 20 characters)' };
  }

  const orderRes = await pool.query(
    `SELECT uuid, status, student_id, writer_id FROM orders WHERE uuid = $1`,
    [orderId]
  );
  if (orderRes.rows.length === 0) return { error: 'Order not found' };
  const order = orderRes.rows[0];

  const allowed = ['SUBMITTED', 'REVISION_REQUESTED', 'ASSIGNED', 'IN_PROGRESS'];
  if (!allowed.includes(order.status)) {
    return { error: 'Disputes can only be raised on active orders' };
  }

  const isStudent = user.role === 'student' && user.uuid === order.student_id;
  const isAssignedWriter = user.role === 'writer' && user.uuid === order.writer_id;
  if (!isStudent && !isAssignedWriter) return { error: 'Not authorised' };

  await pool.query(
    `UPDATE orders SET status = 'DISPUTED' WHERE uuid = $1`,
    [orderId]
  );

  // Notify the other party
  const notifyTarget = isStudent ? order.writer_id : order.student_id;
  if (notifyTarget) {
    await pool.query(
      `INSERT INTO notification (uuid, user_id, order_id, type, text)
       VALUES (gen_random_uuid(), $1, $2, 'DISPUTE_RAISED',
               'A dispute has been raised on your order — admin will review it')`,
      [notifyTarget, orderId]
    );
  }

  redirect(`/orders/${orderId}`);
}
