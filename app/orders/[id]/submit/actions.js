'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';

const ALLOWED = ['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'];

export async function submitPaper(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };
  if (user.role !== 'writer') return { error: 'Only writers can submit' };

  const orderId = formData.get('order_id');
  const filePath = formData.get('file_path')?.trim();
  const watermarkedPath = formData.get('watermarked_file_path')?.trim();

  if (!orderId || !filePath || !watermarkedPath) {
    return { error: 'All fields required' };
  }

  const guard = await pool.query(
    `SELECT writer_id, status FROM orders WHERE uuid = $1`,
    [orderId]
  );
  if (guard.rows.length === 0) return { error: 'Order not found' };
  if (guard.rows[0].writer_id !== user.uuid) return { error: 'Not your order' };
  if (!ALLOWED.includes(guard.rows[0].status)) {
    return { error: `Cannot submit when order is ${guard.rows[0].status}` };
  }

  try {
    await pool.query(
      `CALL sp_submit_paper($1, $2, $3)`,
      [orderId, filePath, watermarkedPath]
    );
  } catch (e) {
    return { error: e.message || 'Failed to submit' };
  }

  redirect(`/orders/${orderId}`);
}
