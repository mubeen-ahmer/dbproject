'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';

export async function placeBid(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };
  if (user.role !== 'writer') return { error: 'Only writers can bid' };

  const orderId = formData.get('order_id');
  const offeredPrice = parseFloat(formData.get('offered_price'));
  const offeredDeadline = formData.get('offered_deadline');

  if (!orderId) return { error: 'Missing order' };
  if (!offeredPrice || offeredPrice <= 0) return { error: 'Invalid price' };
  if (!offeredDeadline) return { error: 'Deadline required' };

  const deadlineDate = new Date(offeredDeadline);
  if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
    return { error: 'Deadline must be in the future' };
  }

  try {
    await pool.query(
      `CALL sp_place_bid($1, $2, $3, $4)`,
      [orderId, user.uuid, offeredPrice, deadlineDate.toISOString()]
    );
  } catch (e) {
    return { error: e.message || 'Failed to place bid' };
  }

  redirect(`/orders/${orderId}`);
}
