'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';

export async function requestRevision(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };
  if (user.role !== 'student') return { error: 'Only students can request revision' };

  const orderId = formData.get('order_id');
  const submissionId = formData.get('submission_id');
  const changes = formData.get('changes')?.trim();

  if (!orderId || !submissionId) return { error: 'Missing order or submission' };
  if (!changes || changes.length < 50) {
    return { error: 'Changes must be at least 50 characters' };
  }

  const guard = await pool.query(
    `SELECT o.student_id, o.status,
            (SELECT uuid FROM submission WHERE order_id = o.uuid AND uuid = $2) AS sub_match
     FROM orders o WHERE o.uuid = $1`,
    [orderId, submissionId]
  );
  if (guard.rows.length === 0) return { error: 'Order not found' };
  const g = guard.rows[0];
  if (g.student_id !== user.uuid) return { error: 'Not your order' };
  if (g.status !== 'SUBMITTED') return { error: `Cannot revise when status is ${g.status}` };
  if (!g.sub_match) return { error: 'Submission does not belong to this order' };

  try {
    await pool.query(
      `CALL sp_request_revision($1, $2, $3)`,
      [orderId, submissionId, changes]
    );
  } catch (e) {
    return { error: e.message || 'Failed to request revision' };
  }

  redirect(`/orders/${orderId}`);
}
