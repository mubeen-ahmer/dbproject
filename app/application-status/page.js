import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function ApplicationStatus() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const result = await pool.query(
    'SELECT status FROM writer WHERE id = $1',
    [user.uuid]
  );

  if (result.rows.length === 0) redirect('/writer-onboarding');

  const status = result.rows[0].status;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4 p-8 relative">
      <div className="absolute top-6 right-6">
        <LogoutButton />
      </div>
      <h1 className="text-3xl font-bold">Writer Application</h1>

      {status === 'PENDING_APPROVAL' && (
        <>
          <div className="text-yellow-400 text-xl">⏳ Pending Review</div>
          <p className="text-gray-400 text-center max-w-md">
            Your application is being reviewed by an admin. You'll be notified once approved.
          </p>
        </>
      )}

      {status === 'APPROVED' && (
        <>
          <div className="text-green-400 text-xl">✓ Approved</div>
          <Link href="/dashboard/writer" className="text-indigo-400 hover:underline">
            Go to Writer Dashboard
          </Link>
        </>
      )}

      {status === 'REJECTED' && (
        <>
          <div className="text-red-400 text-xl">✗ Rejected</div>
          <p className="text-gray-400 text-center max-w-md">
            Your application was not approved. You can continue as a student.
          </p>
          <Link href="/dashboard/student" className="text-indigo-400 hover:underline">
            Go to Student Dashboard
          </Link>
        </>
      )}
    </div>
  );
}
