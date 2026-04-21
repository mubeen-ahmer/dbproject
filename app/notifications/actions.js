'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { revalidatePath } from 'next/cache';

export async function markAllRead() {
  const user = await getCurrentUser();
  if (!user) return;

  await pool.query(
    `UPDATE notification SET read_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND read_at IS NULL`,
    [user.uuid]
  );

  revalidatePath('/notifications');
}

export async function markOneRead(notifId) {
  const user = await getCurrentUser();
  if (!user) return;

  await pool.query(
    `UPDATE notification SET read_at = CURRENT_TIMESTAMP
     WHERE uuid = $1 AND user_id = $2`,
    [notifId, user.uuid]
  );

  revalidatePath('/notifications');
}
