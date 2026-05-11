import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import LogoutButton from '@/components/LogoutButton';
import { markAllRead } from './actions';

export const dynamic = 'force-dynamic';

const TYPE_LABELS = {
  NEW_BID:           'New Bid',
  BID_ACCEPTED:      'Bid Accepted',
  SUBMISSION_READY:  'Submission Ready',
  REVISION_REQUESTED:'Revision Requested',
  PAPER_ACCEPTED:    'Paper Accepted',
  ORDER_REFUNDED:    'Order Refunded',
  NEW_REVIEW:        'New Review',
  DISPUTE_RAISED:    'Dispute Raised',
  DISPUTE_RESOLVED:  'Dispute Resolved',
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const backHref =
    user.role === 'admin'  ? '/dashboard/admin' :
    user.role === 'writer' ? '/dashboard/writer' :
                             '/dashboard/student';

  const result = await pool.query(
    `SELECT uuid, order_id, type, text, read_at, created_at
     FROM notification
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [user.uuid]
  );
  const notifications = result.rows;
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href={backHref} className="text-indigo-400 hover:underline text-sm">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold mt-2">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-400 text-sm mt-1">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          {unreadCount > 0 && (
            <form action={markAllRead}>
              <button
                type="submit"
                className="text-sm text-indigo-400 hover:underline"
              >
                Mark all read
              </button>
            </form>
          )}
          <LogoutButton />
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-gray-500 text-center py-16">No notifications yet.</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.uuid}
              className={`flex items-start gap-4 p-4 rounded-lg border ${
                n.read_at
                  ? 'border-white/5 bg-white/2'
                  : 'border-indigo-500/30 bg-indigo-500/5'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {TYPE_LABELS[n.type] || n.type}
                  </span>
                  {!n.read_at && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                  )}
                </div>
                <p className="text-sm text-gray-200">{n.text}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {n.order_id && (
                <Link
                  href={`/orders/${n.order_id}`}
                  className="text-xs text-indigo-400 hover:underline shrink-0"
                >
                  View order →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
