import { createSupabaseServer } from './server';
import pool from '@/lib/db';

export async function getCurrentUser() {
  const supabase = await createSupabaseServer();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const result = await pool.query(
    `SELECT uuid, role, point, name, email, created_at
     FROM users
     WHERE uuid = $1`,
    [authUser.id]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0];
}
