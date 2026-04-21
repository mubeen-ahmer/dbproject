'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { revalidatePath } from 'next/cache';

async function notifyBoth(orderId, text) {
  const res = await pool.query(
    `SELECT student_id, writer_id FROM orders WHERE uuid = $1`,
    [orderId]
  );
  if (res.rows.length === 0) return;
  const { student_id, writer_id } = res.rows[0];

  const targets = [student_id, writer_id].filter(Boolean);
  for (const uid of targets) {
    await pool.query(
      `INSERT INTO notification (uuid, user_id, order_id, type, text)
       VALUES (gen_random_uuid(), $1, $2, 'DISPUTE_RESOLVED', $3)`,
      [uid, orderId, text]
    );
  }
}

export async function resolveForWriter(formData) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return;

  const orderId = formData.get('order_id');
  await pool.query(`CALL sp_accept_paper($1)`, [orderId]);
  await notifyBoth(orderId, 'Admin resolved the dispute — funds released to the writer');
  revalidatePath('/admin/disputes');
}

export async function resolveForStudent(formData) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return;

  const orderId = formData.get('order_id');

  // Admin override: force-refund regardless of submission count (bypass sp_request_refund guard)
  const priceRes = await pool.query(
    `SELECT selected_price, writer_id FROM orders WHERE uuid = $1`,
    [orderId]
  );
  if (priceRes.rows.length === 0) return;
  const { selected_price, writer_id } = priceRes.rows[0];

  await pool.query(`UPDATE orders SET status = 'REFUNDED' WHERE uuid = $1`, [orderId]);
  await pool.query(
    `INSERT INTO transactions (order_id, status, amount, release_date) VALUES
       ($1, 'REFUNDED',           $2 * 0.70, CURRENT_TIMESTAMP),
       ($1, 'RELEASED_TO_WRITER', $2 * 0.25, CURRENT_TIMESTAMP),
       ($1, 'SPLIT',              $2 * 0.05, CURRENT_TIMESTAMP)`,
    [orderId, selected_price]
  );

  await notifyBoth(orderId, 'Admin resolved the dispute — order refunded to the student');
  revalidatePath('/admin/disputes');
}
