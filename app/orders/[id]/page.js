import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import UserBadges from '@/components/UserBadges';
import { acceptPaper } from './review/actions';
import ReviewForm from './ReviewForm';
import { getAdminSupabase } from '@/lib/supabase/admin';

const BUCKET = 'submissions';

async function signedUrl(path) {
  if (!path || path.startsWith('/stub')) return null;
  const { data } = await getAdminSupabase()
    .storage.from(BUCKET)
    .createSignedUrl(path, 120);
  return data?.signedUrl ?? null;
}

export const dynamic = 'force-dynamic';

const WRITER_CAN_SUBMIT = ['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'];
const REFUNDABLE = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED'];

export default async function OrderDetailPage({ params }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const orderRes = await pool.query(
    `SELECT
       o.*,
       s.name AS subject_name,
       sv.name AS service_name,
       stu.name AS student_name,
       wr_user.name AS writer_name
     FROM orders o
     JOIN subject s ON s.uuid = o.subject_id
     JOIN service sv ON sv.uuid = o.service_id
     JOIN users stu ON stu.uuid = o.student_id
     LEFT JOIN users wr_user ON wr_user.uuid = o.writer_id
     WHERE o.uuid = $1`,
    [id]
  );

  if (orderRes.rows.length === 0) notFound();
  const order = orderRes.rows[0];

  const isStudent = user.role === 'student' && user.uuid === order.student_id;
  const isWriter = user.role === 'writer';
  const isAssignedWriter = isWriter && user.uuid === order.writer_id;
  const isAdmin = user.role === 'admin';

  if (!isStudent && !isWriter && !isAdmin) redirect('/');

  const [bidsRes, subsRes, revsRes, reviewsRes] = await Promise.all([
    pool.query(
      `SELECT b.uuid, b.offered_price, b.offered_deadline, b.status, b.created_at,
              b.writer_id, u.name AS writer_name, u.point AS writer_points,
              u.created_at AS writer_joined
       FROM bid b
       JOIN users u ON u.uuid = b.writer_id
       WHERE b.order_id = $1
       ORDER BY b.created_at DESC`,
      [id]
    ),
    pool.query(
      `SELECT uuid, count, file_path, watermarked_file_path, status, created_at
       FROM submission WHERE order_id = $1 ORDER BY count DESC`,
      [id]
    ),
    pool.query(
      `SELECT uuid, submission_id, changes, created_at
       FROM revision WHERE order_id = $1 ORDER BY created_at DESC`,
      [id]
    ),
    pool.query(
      `SELECT r.uuid, r.reviewer_id, r.rating, r.text, r.time,
              au.name AS reviewer_name
       FROM review r
       JOIN users au ON au.uuid = r.reviewer_id
       WHERE r.order_id = $1
       ORDER BY r.time DESC`,
      [id]
    ),
  ]);

  const bids = bidsRes.rows;
  const revisions = revsRes.rows;
  const reviews = reviewsRes.rows;

  // Attach signed URLs to each submission (2-min expiry, generated server-side)
  const submissions = await Promise.all(
    subsRes.rows.map(async (s) => ({
      ...s,
      watermarked_url: await signedUrl(s.watermarked_file_path),
      original_url: await signedUrl(s.file_path),
    }))
  );

  const myBid = isWriter ? bids.find((b) => b.writer_id === user.uuid) : null;
  const latestSubmission = submissions[0];

  const dashboardPath =
    user.role === 'admin' ? '/dashboard/admin' :
    user.role === 'writer' ? '/dashboard/writer' : '/dashboard/student';

  const canBid =
    isWriter && !isAdmin && !myBid &&
    ['OPEN', 'BIDDING'].includes(order.status) &&
    user.uuid !== order.student_id;

  const canSubmit = isAssignedWriter && WRITER_CAN_SUBMIT.includes(order.status);
  const canReview = isStudent && order.status === 'SUBMITTED';
  const canRequestRevision = canReview && revisions.length < 3;
  const canRequestRefund =
    isStudent && REFUNDABLE.includes(order.status) && order.selected_price &&
    submissions.length < 3;

  const DISPUTABLE = ['SUBMITTED', 'REVISION_REQUESTED', 'ASSIGNED', 'IN_PROGRESS'];
  const canDispute =
    (isStudent || isAssignedWriter) &&
    DISPUTABLE.includes(order.status) &&
    order.selected_price;

  const currentUserReviewed = reviews.some((r) => r.reviewer_id === user.uuid);
  const canLeaveReview =
    order.status === 'COMPLETED' &&
    (isStudent || isAssignedWriter) &&
    !currentUserReviewed;
  const reviewTargetName = isStudent ? order.writer_name : order.student_name;

  const canChat = isStudent || isAssignedWriter || isAdmin;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-1">
        <Link href={dashboardPath} className="text-indigo-400 hover:underline text-sm">
          ← Dashboard
        </Link>
        {canChat && (
          <Link
            href={`/orders/${order.uuid}/chat`}
            className="text-sm bg-white/5 border border-white/10 px-3 py-1 rounded hover:bg-white/10"
          >
            💬 Chat
          </Link>
        )}
      </div>

      <div className="flex justify-between items-start mt-2 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{order.title}</h1>
          <p className="text-gray-400 text-sm mt-1">
            Created {new Date(order.created_at).toLocaleString()}
            {isAdmin && ` by ${order.student_name}`}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 bg-white/5 border border-white/10 rounded-lg p-4">
        <Field label="Subject" value={order.subject_name} />
        <Field label="Service" value={order.service_name} />
        <Field label="Pages" value={order.pages} />
        <Field label="Academic Level" value={order.academic_level.replace('_', ' ')} />
        <Field label="Citation Style" value={order.citation_style} />
        <Field label="Deadline" value={new Date(order.deadline_offered).toLocaleString()} />
        <Field label="Minimum Price" value={`$${Number(order.minimum_price).toFixed(2)}`} />
        {order.selected_price && (
          <Field label="Agreed Price" value={`$${Number(order.selected_price).toFixed(2)}`} />
        )}
        {order.writer_name && <Field label="Assigned Writer" value={order.writer_name} />}
      </div>

      {order.additional_info && (
        <div className="mb-6">
          <h3 className="text-sm text-gray-400 uppercase mb-2">Additional Info</h3>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 whitespace-pre-wrap text-sm">
            {order.additional_info}
          </div>
        </div>
      )}

      {canBid && (
        <div className="mb-6">
          <Link
            href={`/orders/${order.uuid}/bid`}
            className="inline-block bg-indigo-500 hover:bg-indigo-400 px-6 py-2 rounded"
          >
            Place a Bid
          </Link>
        </div>
      )}

      {isWriter && myBid && !isAssignedWriter && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="text-green-400 font-semibold text-sm mb-1">Your bid</div>
          <div className="text-sm">
            ${Number(myBid.offered_price).toFixed(2)} · deadline{' '}
            {new Date(myBid.offered_deadline).toLocaleString()} · status {myBid.status}
          </div>
        </div>
      )}

      {canSubmit && (
        <div className="mb-6 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
          <div className="text-indigo-300 font-semibold text-sm mb-2">
            {order.status === 'REVISION_REQUESTED'
              ? 'Revision requested — submit an updated version'
              : "You're assigned to this order"}
          </div>
          <Link
            href={`/orders/${order.uuid}/submit`}
            className="inline-block bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded text-sm"
          >
            Submit Work
          </Link>
        </div>
      )}

      {canReview && latestSubmission && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="text-yellow-300 font-semibold text-sm mb-2">
            Writer submitted work — review it
          </div>
          <div className="text-xs text-gray-400 mb-3">
            {latestSubmission.watermarked_url ? (
              <a
                href={latestSubmission.watermarked_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline"
              >
                View watermarked preview ↗
              </a>
            ) : (
              <span className="font-mono">{latestSubmission.watermarked_file_path}</span>
            )}
          </div>
          <div className="flex gap-2">
            <form action={acceptPaper}>
              <input type="hidden" name="order_id" value={order.uuid} />
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm"
              >
                Accept & Release Funds
              </button>
            </form>
            {canRequestRevision ? (
              <Link
                href={`/orders/${order.uuid}/review/revision`}
                className="bg-orange-500 hover:bg-orange-400 px-4 py-2 rounded text-sm"
              >
                Request Revision ({revisions.length}/3 used)
              </Link>
            ) : (
              <span className="text-gray-500 text-xs self-center">
                Revisions exhausted (3/3)
              </span>
            )}
          </div>
        </div>
      )}

      {order.status === 'COMPLETED' && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="text-green-400 font-semibold text-sm">
            Order completed · funds released to writer
          </div>
        </div>
      )}

      {order.status === 'REFUNDED' && (
        <div className="mb-6 bg-gray-500/10 border border-gray-500/30 rounded-lg p-4">
          <div className="text-gray-300 font-semibold text-sm">
            Order refunded · split 70% student / 25% writer / 5% platform · reviews disabled
          </div>
        </div>
      )}

      {canRequestRefund && (
        <div className="mb-6">
          <Link
            href={`/orders/${order.uuid}/refund`}
            className="inline-block text-red-400 hover:text-red-300 text-sm underline"
          >
            Request refund ({submissions.length === 0 ? '70/25/5' :
              submissions.length === 1 ? '50/40/10' : '30/60/10'} split)
          </Link>
        </div>
      )}

      {isStudent && submissions.length >= 3 && REFUNDABLE.includes(order.status) && (
        <div className="mb-6 text-xs text-gray-500">
          Refund locked after 3 submissions — accept the current work to complete the order.
        </div>
      )}

      {canDispute && (
        <div className="mb-6">
          <Link
            href={`/orders/${order.uuid}/dispute`}
            className="inline-block text-yellow-500 hover:text-yellow-400 text-sm underline"
          >
            Raise a dispute
          </Link>
        </div>
      )}

      {order.status === 'DISPUTED' && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="text-yellow-300 font-semibold text-sm">
            This order is under dispute — an admin will review and resolve it.
          </div>
        </div>
      )}

      {canLeaveReview && (
        <div className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-3">Leave a Review</h2>
          <ReviewForm orderId={order.uuid} targetName={reviewTargetName} />
        </div>
      )}

      {reviews.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3">Reviews</h2>
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.uuid} className="border border-white/10 rounded-lg p-4 bg-white/5">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold text-sm">{r.reviewer_name}</div>
                  <div className="text-yellow-400">
                    {'★'.repeat(r.rating)}
                    <span className="text-gray-600">{'★'.repeat(5 - r.rating)}</span>
                  </div>
                </div>
                {r.text && <div className="text-sm text-gray-300 whitespace-pre-wrap">{r.text}</div>}
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(r.time).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {submissions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3">Submissions ({submissions.length})</h2>
          <div className="space-y-2">
            {submissions.map((s) => {
              const showOriginal = isAssignedWriter || isAdmin || (isStudent && s.status === 'ACCEPTED');
              return (
                <div key={s.uuid} className="border border-white/10 rounded-lg p-4 bg-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">
                        Submission #{s.count}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        s.status === 'ACCEPTED'
                          ? 'bg-green-500/20 text-green-300'
                          : s.status === 'REVISION_REQUESTED'
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs space-y-2 mt-2">
                    {s.watermarked_url ? (
                      <a
                        href={s.watermarked_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block bg-white/5 border border-white/10 px-3 py-1 rounded hover:bg-white/10 text-indigo-300"
                      >
                        View watermarked preview ↗
                      </a>
                    ) : (
                      <span className="text-gray-500 font-mono">{s.watermarked_file_path}</span>
                    )}
                    {showOriginal && (
                      s.original_url ? (
                        <div>
                          <a
                            href={s.original_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block bg-green-500/10 border border-green-500/30 px-3 py-1 rounded hover:bg-green-500/20 text-green-300"
                          >
                            Download original ↗
                          </a>
                        </div>
                      ) : (
                        <div className="text-gray-500 font-mono">{s.file_path}</div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {revisions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3">Revision Requests ({revisions.length}/3)</h2>
          <div className="space-y-2">
            {revisions.map((r) => (
              <div key={r.uuid} className="border border-white/10 rounded-lg p-4 bg-white/5">
                <div className="text-xs text-gray-400 mb-2">
                  {new Date(r.created_at).toLocaleString()}
                </div>
                <div className="text-sm whitespace-pre-wrap">{r.changes}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(isStudent || isAdmin) && (
        <div>
          <h2 className="text-xl font-bold mb-3">Bids ({bids.length})</h2>
          {bids.length === 0 ? (
            <div className="text-gray-500 text-sm">No bids yet.</div>
          ) : (
            <div className="space-y-2">
              {bids.map((b) => (
                <div
                  key={b.uuid}
                  className="border border-white/10 rounded-lg p-4 bg-white/5 flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{b.writer_name}</span>
                      <UserBadges points={b.writer_points} created_at={b.writer_joined} />
                    </div>
                    <div className="text-xs text-gray-400">
                      {b.writer_points} pts · bid {new Date(b.created_at).toLocaleString()}
                    </div>
                    <div className="text-sm mt-1">
                      ${Number(b.offered_price).toFixed(2)} · delivers by{' '}
                      {new Date(b.offered_deadline).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        b.status === 'ACCEPTED'
                          ? 'bg-green-500/20 text-green-300'
                          : b.status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-gray-500/20 text-gray-300'
                      }`}
                    >
                      {b.status}
                    </span>
                    {isStudent &&
                      b.status === 'PENDING' &&
                      ['OPEN', 'BIDDING'].includes(order.status) && (
                        <Link
                          href={`/orders/${order.uuid}/pay/${b.uuid}`}
                          className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm"
                        >
                          Accept & Pay
                        </Link>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className="text-sm text-gray-200 mt-1">{value}</div>
    </div>
  );
}
