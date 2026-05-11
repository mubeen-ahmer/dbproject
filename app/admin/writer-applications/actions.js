'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}

export async function approveWriter(formData) {
  await requireAdmin();
  const writerId = formData.get('writerId');
  if (!writerId) throw new Error('writerId required');

  await pool.query(
    `UPDATE writer SET status = 'APPROVED' WHERE id = $1`,
    [writerId]
  );
  await pool.query(
    `UPDATE users SET role = 'writer' WHERE uuid = $1`,
    [writerId]
  );

  revalidatePath('/admin/writer-applications');
}

export async function rejectWriter(formData) {
  await requireAdmin();
  const writerId = formData.get('writerId');
  if (!writerId) throw new Error('writerId required');

  await pool.query(
    `UPDATE writer SET status = 'REJECTED' WHERE id = $1`,
    [writerId]
  );

  revalidatePath('/admin/writer-applications');
}
