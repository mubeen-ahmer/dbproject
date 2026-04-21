import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { getTenure } from '@/lib/badges';
import { approveWriter, rejectWriter } from './actions';

export const dynamic = 'force-dynamic';

export default async function WriterApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'admin') redirect('/');

  const result = await pool.query(
    `SELECT
       w.id,
       w.qualification,
       w.bio,
       au.name,
       au.email,
       au."createdAt" AS created_at,
       (
         SELECT COALESCE(array_agg(s.name ORDER BY s.name), '{}')
         FROM writer_subject ws
         JOIN subject s ON s.uuid = ws.subject_id
         WHERE ws.writer_id = w.id
       ) AS subjects,
       (
         SELECT COALESCE(array_agg(sv.name ORDER BY sv.name), '{}')
         FROM writer_service wsv
         JOIN service sv ON sv.uuid = wsv.service_id
         WHERE wsv.writer_id = w.id
       ) AS services
     FROM writer w
     JOIN neon_auth."user" au ON au.id = w.id
     WHERE w.status = 'PENDING_APPROVAL'
     ORDER BY au."createdAt" DESC`
  );

  const applications = result.rows;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/dashboard/admin" className="text-indigo-400 hover:underline text-sm">
            ← Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-2">Writer Applications</h1>
          <p className="text-gray-400 text-sm mt-1">
            {applications.length} pending {applications.length === 1 ? 'application' : 'applications'}
          </p>
        </div>
        <LogoutButton />
      </div>

      {applications.length === 0 ? (
        <div className="text-gray-500 text-center py-16">
          No pending applications.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const tenure = getTenure(app.created_at);
            return (
            <div key={app.id} className="border border-white/10 rounded-lg p-6 bg-white/5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{app.name}</h2>
                    <span className={`${tenure.className} text-xs px-2 py-0.5 rounded font-medium`}>
                      {tenure.label}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{app.email}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Joined {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={approveWriter}>
                    <input type="hidden" name="writerId" value={app.id} />
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectWriter}>
                    <input type="hidden" name="writerId" value={app.id} />
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs text-gray-500 uppercase mb-1">Qualification</div>
                <div className="text-gray-200 text-sm">{app.qualification}</div>
              </div>

              <div className="mb-3">
                <div className="text-xs text-gray-500 uppercase mb-1">Bio</div>
                <div className="text-gray-200 text-sm whitespace-pre-wrap">{app.bio}</div>
              </div>

              <div className="mb-3">
                <div className="text-xs text-gray-500 uppercase mb-1">
                  Subjects ({app.subjects.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {app.subjects.map((s) => (
                    <span key={s} className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">
                  Services ({app.services.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {app.services.map((s) => (
                    <span key={s} className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
