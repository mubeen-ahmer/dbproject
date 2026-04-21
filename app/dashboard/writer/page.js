import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import UserBadges from '@/components/UserBadges';
import { getTier, nextTier } from '@/lib/badges';
import NotificationBell from '@/components/NotificationBell';

export const dynamic = 'force-dynamic';

export default async function WriterDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'writer') redirect('/');

  const tier = getTier(user.point);
  const next = nextTier(user.point);
  const toNext = next ? next.min - user.point : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-3xl font-bold">Writer Dashboard</h1>
        <div className="flex items-center gap-3">
          <NotificationBell userId={user.uuid} />
          <LogoutButton />
        </div>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <p className="text-gray-400">Hello, {user.name}.</p>
        <UserBadges points={user.point} createdAt={user.created_at} />
      </div>
      <p className="text-gray-500 text-sm mb-6">
        {user.point} points · {tier.label}
        {next && ` · ${toNext} to ${next.label}`}
      </p>

      <div className="flex gap-4 flex-wrap">
        <Link href="/orders/pool" className="bg-indigo-500 px-4 py-2 rounded hover:bg-indigo-400">
          Browse Order Pool
        </Link>
        <Link href="/orders/my" className="border border-white/20 px-4 py-2 rounded hover:bg-white/5">
          My Orders
        </Link>
        <Link href="/payments" className="border border-white/20 px-4 py-2 rounded hover:bg-white/5">
          Earnings
        </Link>
        <Link href="/leaderboard" className="border border-white/20 px-4 py-2 rounded hover:bg-white/5">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
