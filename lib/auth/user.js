import { auth } from './server';
import pool from '@/lib/db';

export async function getCurrentUser() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;

  const result = await pool.query(
    `SELECT u.uuid, u.role, u.point, au.name, au.email, au."createdAt" AS created_at
     FROM users u
     JOIN neon_auth."user" au ON au.id = u.uuid
     WHERE u.uuid = $1`,
    [session.user.id]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0];
}
