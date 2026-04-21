import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import OnboardingForm from './OnboardingForm';

export const dynamic = 'force-dynamic';

export default async function WriterOnboarding() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const existing = await pool.query(
    'SELECT status FROM writer WHERE id = $1',
    [user.uuid]
  );
  if (existing.rows.length > 0) redirect('/application-status');

  const subjectsResult = await pool.query('SELECT uuid, name FROM subject ORDER BY name');
  const servicesResult = await pool.query('SELECT uuid, name FROM service ORDER BY name');

  return (
    <OnboardingForm
      subjects={subjectsResult.rows}
      services={servicesResult.rows}
    />
  );
}
