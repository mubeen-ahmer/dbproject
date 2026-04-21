import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import NotificationBell from '@/components/NotificationBell';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'admin') redirect('/');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          <NotificationBell userId={user.uuid} />
          <LogoutButton />
        </div>
      </div>
      <p className="text-gray-400 mb-6">Hello, {user.name}</p>

      <div className="flex gap-4 flex-wrap">
        <Link href="/admin/writer-applications" className="bg-indigo-500 px-4 py-2 rounded hover:bg-indigo-400">
          Writer Applications
        </Link>
        <Link href="/payments" className="border border-white/20 px-4 py-2 rounded hover:bg-white/5">
          Payments
        </Link>
        <Link href="/admin/disputes" className="border border-white/20 px-4 py-2 rounded hover:bg-white/5">
          Disputes
        </Link>
        <Link href="/leaderboard" className="border border-white/20 px-4 py-2 rounded hover:bg-white/5">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
