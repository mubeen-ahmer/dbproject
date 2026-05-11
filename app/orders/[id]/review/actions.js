'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function acceptPaper(formData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');
  if (user.role !== 'student') throw new Error('Only students can accept');

  const orderId = formData.get('order_id');
  if (!orderId) throw new Error('Missing order');

  const guard = await pool.query(
    `SELECT student_id, status FROM orders WHERE uuid = $1`,
    [orderId]
  );
  if (guard.rows.length === 0) throw new Error('Order not found');
  if (guard.rows[0].student_id !== user.uuid) throw new Error('Not your order');
  if (guard.rows[0].status !== 'SUBMITTED') {
    throw new Error(`Cannot accept when order is ${guard.rows[0].status}`);
  }

  await pool.query(`CALL sp_accept_paper($1)`, [orderId]);

  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function submitReview(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };

  const orderId = formData.get('order_id');
  const rating = parseInt(formData.get('rating'), 10);
  const text = formData.get('text')?.trim() || null;

  if (!orderId) return { error: 'Missing order' };
  if (!rating || rating < 1 || rating > 5) return { error: 'Rating must be 1-5' };

  const guard = await pool.query(
    `SELECT student_id, writer_id, status FROM orders WHERE uuid = $1`,
    [orderId]
  );
  if (guard.rows.length === 0) return { error: 'Order not found' };
  const g = guard.rows[0];

  const isStudent = user.uuid === g.student_id;
  const isWriter = user.uuid === g.writer_id;
  if (!isStudent && !isWriter) return { error: 'Not a party to this order' };
  if (g.status !== 'COMPLETED') {
    return { error: 'Can only review completed orders' };
  }

  try {
    await pool.query(
      `INSERT INTO review (order_id, reviewer_id, rating, text)
       VALUES ($1, $2, $3, $4)`,
      [orderId, user.uuid, rating, text]
    );
  } catch (e) {
    if (e.message?.includes('duplicate') || e.message?.includes('unique')) {
      return { error: 'You already reviewed this order' };
    }
    return { error: e.message || 'Failed to submit review' };
  }

  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}
