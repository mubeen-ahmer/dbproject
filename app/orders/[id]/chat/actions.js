'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';

export async function sendMessage(formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };

  const orderId = formData.get('order_id');
  const text = formData.get('text')?.trim();

  if (!text) return { error: 'Message cannot be empty' };
  if (text.length > 2000) return { error: 'Message too long' };

  const orderRes = await pool.query(
    `SELECT student_id, writer_id, status FROM orders WHERE uuid = $1`,
    [orderId]
  );
  if (orderRes.rows.length === 0) return { error: 'Order not found' };
  const order = orderRes.rows[0];

  const isParticipant =
    user.uuid === order.student_id ||
    user.uuid === order.writer_id ||
    user.role === 'admin';
  if (!isParticipant) return { error: 'Not authorised' };

  await pool.query(
    `INSERT INTO chat (uuid, order_id, sender_id, text)
     VALUES (gen_random_uuid(), $1, $2, $3)`,
    [orderId, user.uuid, text]
  );

  return { ok: true };
}
