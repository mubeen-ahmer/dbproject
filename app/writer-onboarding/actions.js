'use server';

import { auth } from '@/lib/auth/server';
import pool from '@/lib/db';
import { redirect } from 'next/navigation';

export async function submitApplication(_prevState, formData) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { error: 'Not signed in' };

  const qualification = formData.get('qualification');
  const bio = formData.get('bio');
  const subjectIds = formData.get('subjects')?.split(',').filter(Boolean) || [];
  const serviceIds = formData.get('services')?.split(',').filter(Boolean) || [];

  if (!qualification || !bio) return { error: 'Qualification and bio required' };
  if (subjectIds.length === 0) return { error: 'Select at least one subject' };
  if (serviceIds.length === 0) return { error: 'Select at least one service' };

  const userId = session.user.id;

  await pool.query(
    'INSERT INTO writer (id, qualification, bio, status) VALUES ($1, $2, $3, $4)',
    [userId, qualification, bio, 'PENDING_APPROVAL']
  );

  for (const sid of subjectIds) {
    await pool.query(
      'INSERT INTO writer_subject (writer_id, subject_id) VALUES ($1, $2)',
      [userId, sid]
    );
  }

  for (const svid of serviceIds) {
    await pool.query(
      'INSERT INTO writer_service (writer_id, service_id) VALUES ($1, $2)',
      [userId, svid]
    );
  }

  redirect('/application-status');
}
