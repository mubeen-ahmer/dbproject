'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';

export async function createOrder(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };
  if (user.role !== 'student') return { error: 'Only students can create orders' };

  const title = formData.get('title')?.trim();
  const subjectId = formData.get('subject_id');
  const serviceId = formData.get('service_id');
  const pages = parseInt(formData.get('pages'), 10);
  const academicLevel = formData.get('academic_level');
  const citationStyle = formData.get('citation_style') || 'NONE';
  const deadline = formData.get('deadline_offered');
  const additionalInfo = formData.get('additional_info')?.trim() || null;

  if (!title || !subjectId || !serviceId || !pages || !academicLevel || !deadline) {
    return { error: 'All required fields must be filled' };
  }
  if (pages < 1) return { error: 'Pages must be at least 1' };

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
    return { error: 'Deadline must be in the future' };
  }

  let orderId;
  try {
    const result = await pool.query(
      `INSERT INTO orders
         (student_id, subject_id, service_id, title, additional_info, pages,
          minimum_price, deadline_offered, academic_level, citation_style)
       VALUES ($1, $2, $3, $4, $5, $6, 0.01, $7, $8, $9)
       RETURNING uuid`,
      [user.uuid, subjectId, serviceId, title, additionalInfo, pages,
       deadlineDate.toISOString(), academicLevel, citationStyle]
    );
    orderId = result.rows[0].uuid;
  } catch (e) {
    return { error: e.message || 'Failed to create order' };
  }

  redirect(`/orders/${orderId}`);
}
