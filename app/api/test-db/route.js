import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM subject');
    return NextResponse.json({ subjectCount: result.rows[0].count });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
