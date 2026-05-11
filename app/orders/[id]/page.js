import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import UserBadges from '@/components/UserBadges';
import { acceptPaper } from './review/actions';
import ReviewForm from './ReviewForm';
import { getAdminSupabase } from '@/lib/supabase/admin';

const BUCKET = 'submissions';

async function signedUrl(path) {
  if (!path || path.startsWith('/stub')) return null;
  const { data } = await getAdminSupabase().storage.from(BUCKET).createSignedUrl(path, 120);
  return data?.signedUrl ?? null;
}

export const dynamic = 'force-dynamic';

const WRITER_CAN_SUBMIT = ['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'];
const REFUNDABLE = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED'];

const STATUS_BADGE = {
  OPEN: ['bg-blue-500/15 text-blue-300 border-blue-500/25', 'BIDDING'],
  BIDDING: ['bg-blue-500/15 text-blue-300 border-blue-500/25', 'BIDDING'],
  ASSIGNED: ['bg-indigo-500/15 text-indigo-300 border-indigo-500/25', 'ASSIGNED'],
  IN_PROGRESS: ['bg-indigo-500/15 text-indigo-300 border-indigo-500/25', 'IN PROGRESS'],
  UNDER_REVIEW: ['bg-yellow-500/15 text-yellow-300 border-yellow-500/25', 'UNDER REVIEW'],
  SUBMITTED: ['bg-yellow-500/15 text-yellow-300 border-yellow-500/25', 'SUBMITTED'],
  REVISION_REQUESTED: ['bg-orange-500/12 text-orange-300 border-orange-500/25', 'REVISION'],
  COMPLETED: ['bg-green-500/12 text-green-300 border-green-500/25', 'COMPLETED'],
  DISPUTED: ['bg-red-500/12 text-red-300 border-red-500/25', 'DISPUTED'],
  CANCELLED: ['bg-gray-500/15 text-gray-300 border-gray-500/25', 'CANCELLED'],
  REFUNDED: ['bg-gray-500/15 text-gray-300 border-gray-500/25', 'REFUNDED'],
};

function StatusBadge({ status }) {
  const [cls, label] = STATUS_BADGE[status] || ['bg-gray-500/15 text-gray-300 border-gray-500/25', status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="text-[10px] text-gray-700 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[12px] font-semibold text-gray-400">{value}</div>
    </div>
  );
}

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

  const submissions = await Promise.all(
    subsRes.rows.map(async (s) => ({
      ...s,
      watermarked_url: await signedUrl(s.watermarked_file_path),
      original_url: await signedUrl(s.file_path),
    }))
  );

  const myBid = isWriter ? bids.find((b) => b.writer_id === user.uuid) : null;
  const latestSubmission = submissions[0];

  const backHref =
    user.role === 'admin' ? '/dashboard/admin' :
    user.role === 'writer' ? '/orders/my' : '/orders/my';

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
    <div className="min-h-screen bg-[#0f1724] text-white flex flex-col">
      {/* Top nav */}
      <div
        className="h-14 flex items-center px-6 gap-3 flex-shrink-0 border-b"
        style={{ background: '#0a0f1a', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <Link href={backHref} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          My Orders
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-gray-400 flex-1 truncate">{order.title}</span>
        <div
          className="font-mono text-[11px] text-gray-500 rounded-md px-2.5 py-0.5 border flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {order.uuid.slice(0, 8).toUpperCase()}
        </div>
        {canChat && (
          <Link
            href={`/orders/${order.uuid}/chat`}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold bg-indigo-500/12 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/20 transition"
          >
            Chat
          </Link>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Order Details */}
        <aside
          className="w-[340px] border-r overflow-y-auto flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="p-5">
            <div className="mb-4">
              <div className="text-[15px] font-bold leading-tight mb-2">{order.title}</div>
              <div className="flex gap-1.5 flex-wrap">
                <StatusBadge status={order.status} />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/15 text-gray-300 border border-gray-500/25">
                  {order.service_name}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <Meta label="Subject" value={order.subject_name} />
              <Meta label="Level" value={(order.academic_level || '').replace('_', ' ')} />
              <Meta label="Pages" value={`${order.pages} ${order.pages === 1 ? 'page' : 'pages'}`} />
              <Meta label="Citation" value={order.citation_style || '—'} />
              <Meta label="Deadline" value={new Date(order.deadline_offered).toLocaleDateString()} />
              <Meta label="Posted" value={new Date(order.created_at).toLocaleDateString()} />
              <Meta label="Min price" value={`$${Number(order.minimum_price).toFixed(0)}`} />
              {order.selected_price && <Meta label="Agreed" value={`$${Number(order.selected_price).toFixed(0)}`} />}
            </div>

            {order.additional_info && (
              <div>
                <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">Instructions</div>
                <div
                  className="text-[12px] text-gray-500 leading-relaxed rounded-xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="whitespace-pre-wrap">{order.additional_info}</div>
                </div>
              </div>
            )}

            {order.writer_name && (
              <div className="mt-4 rounded-xl border p-3.5" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.2)' }}>
                <div className="text-[12px] font-semibold text-green-300 mb-1">
                  {isAssignedWriter ? 'You are assigned' : 'Writer assigned'}
                </div>
                <div className="text-[12px] text-gray-400">{order.writer_name}</div>
              </div>
            )}

            {isAdmin && (
              <div className="mt-4 rounded-xl border p-3.5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">Student</div>
                <div className="text-[12px] text-gray-400">{order.student_name}</div>
              </div>
            )}
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-4xl mx-auto flex flex-col gap-4">
            {/* Action banners */}
            {canBid && (
              <div className="rounded-xl border p-4 flex justify-between items-center" style={{ background: '#141e2e', borderColor: 'rgba(99,102,241,0.3)' }}>
                <div>
                  <div className="text-sm font-semibold mb-1">Place a bid to win this order</div>
                  <div className="text-[12px] text-gray-500">Submit your price, timeline, and pitch.</div>
                </div>
                <Link
                  href={`/orders/${order.uuid}/bid`}
                  className="px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold transition"
                >
                  Place a bid
                </Link>
              </div>
            )}

            {isWriter && myBid && !isAssignedWriter && (
              <div className="rounded-xl border p-4" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}>
                <div className="text-green-300 font-semibold text-[13px] mb-1">Your bid</div>
                <div className="text-[13px] text-gray-400">
                  ${Number(myBid.offered_price).toFixed(2)} · by{' '}
                  {new Date(myBid.offered_deadline).toLocaleDateString()} · status {myBid.status}
                </div>
              </div>
            )}

            {canSubmit && (
              <div className="rounded-xl border p-4 flex justify-between items-center" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }}>
                <div>
                  <div className="text-indigo-300 font-semibold text-[13px] mb-1">
                    {order.status === 'REVISION_REQUESTED'
                      ? 'Revision requested — submit an updated version'
                      : "You're assigned to this order"}
                  </div>
                  <div className="text-[12px] text-gray-500">Upload a PDF — a watermarked preview will be shown to the student.</div>
                </div>
                <Link
                  href={`/orders/${order.uuid}/submit`}
                  className="px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold transition"
                >
                  Submit Work
                </Link>
              </div>
            )}

            {canReview && latestSubmission && (
              <div className="rounded-xl border p-4" style={{ background: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.25)' }}>
                <div className="text-yellow-300 font-semibold text-[13px] mb-2">Writer submitted work — review it</div>
                <div className="text-[12px] text-gray-400 mb-3">
                  {latestSubmission.watermarked_url ? (
                    <a href={latestSubmission.watermarked_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                      View watermarked preview ↗
                    </a>
                  ) : (
                    <span className="font-mono">{latestSubmission.watermarked_file_path}</span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <form action={acceptPaper}>
                    <input type="hidden" name="order_id" value={order.uuid} />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-green-500/15 text-green-300 border border-green-500/25 hover:bg-green-500/25 text-sm font-semibold transition"
                    >
                      Accept &amp; Release Funds
                    </button>
                  </form>
                  {canRequestRevision ? (
                    <Link
                      href={`/orders/${order.uuid}/review/revision`}
                      className="px-4 py-2 rounded-lg bg-yellow-500/12 text-yellow-300 border border-yellow-500/25 hover:bg-yellow-500/20 text-sm font-semibold transition"
                    >
                      Request Revision ({revisions.length}/3)
                    </Link>
                  ) : (
                    <span className="text-gray-500 text-xs self-center">Revisions exhausted (3/3)</span>
                  )}
                </div>
              </div>
            )}

            {order.status === 'COMPLETED' && (
              <div className="rounded-xl border p-4" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}>
                <div className="text-green-300 font-semibold text-[13px]">Order completed · funds released to writer</div>
              </div>
            )}

            {order.status === 'REFUNDED' && (
              <div className="rounded-xl border p-4" style={{ background: 'rgba(107,114,128,0.12)', borderColor: 'rgba(107,114,128,0.25)' }}>
                <div className="text-gray-300 font-semibold text-[13px]">
                  Order refunded · split 70% student / 25% writer / 5% platform
                </div>
              </div>
            )}

            {order.status === 'DISPUTED' && (
              <div className="rounded-xl border p-4" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
                <div className="text-red-300 font-semibold text-[13px]">
                  This order is under dispute — an admin will review and resolve it.
                </div>
              </div>
            )}

            {/* Secondary action links */}
            {(canRequestRefund || canDispute) && (
              <div className="flex gap-6 text-[12px]">
                {canRequestRefund && (
                  <Link href={`/orders/${order.uuid}/refund`} className="text-red-400 hover:text-red-300 underline">
                    Request refund (
                    {submissions.length === 0 ? '70/25/5' : submissions.length === 1 ? '50/40/10' : '30/60/10'} split)
                  </Link>
                )}
                {canDispute && (
                  <Link href={`/orders/${order.uuid}/dispute`} className="text-yellow-500 hover:text-yellow-400 underline">
                    Raise a dispute
                  </Link>
                )}
              </div>
            )}

            {isStudent && submissions.length >= 3 && REFUNDABLE.includes(order.status) && (
              <div className="text-xs text-gray-500">Refund locked after 3 submissions — accept current work to complete the order.</div>
            )}

            {canLeaveReview && (
              <div
                className="rounded-xl border p-5"
                style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="text-base font-bold mb-3">Leave a Review</div>
                <ReviewForm orderId={order.uuid} targetName={reviewTargetName} />
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section>
                <div className="text-[13px] font-bold mb-3">Reviews ({reviews.length})</div>
                <div className="flex flex-col gap-2">
                  {reviews.map((r) => (
                    <div
                      key={r.uuid}
                      className="rounded-xl border p-4"
                      style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-semibold text-sm">{r.reviewer_name}</div>
                        <div className="text-yellow-400 text-sm">
                          {'★'.repeat(r.rating)}
                          <span className="text-gray-700">{'★'.repeat(5 - r.rating)}</span>
                        </div>
                      </div>
                      {r.text && <div className="text-[13px] text-gray-400 whitespace-pre-wrap leading-relaxed">{r.text}</div>}
                      <div className="text-[10px] text-gray-600 mt-2">{new Date(r.time).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Submissions */}
            {submissions.length > 0 && (
              <section>
                <div className="text-[13px] font-bold mb-3">Submissions ({submissions.length})</div>
                <div className="flex flex-col gap-2">
                  {submissions.map((s) => {
                    const showOriginal = isAssignedWriter || isAdmin || (isStudent && s.status === 'ACCEPTED');
                    return (
                      <div
                        key={s.uuid}
                        className="rounded-xl border p-4"
                        style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-[13px] font-semibold">Submission #{s.count}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">{new Date(s.created_at).toLocaleString()}</div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              s.status === 'ACCEPTED'
                                ? 'bg-green-500/15 text-green-300 border-green-500/25'
                                : s.status === 'REVISION_REQUESTED'
                                ? 'bg-orange-500/15 text-orange-300 border-orange-500/25'
                                : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {s.watermarked_url ? (
                            <a
                              href={s.watermarked_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-semibold bg-indigo-500/12 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/20 transition"
                            >
                              View watermarked preview ↗
                            </a>
                          ) : (
                            <span className="text-gray-500 font-mono text-[11px]">{s.watermarked_file_path}</span>
                          )}
                          {showOriginal &&
                            (s.original_url ? (
                              <a
                                href={s.original_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-semibold bg-green-500/12 text-green-300 border border-green-500/25 hover:bg-green-500/20 transition"
                              >
                                Download original ↗
                              </a>
                            ) : (
                              <span className="text-gray-500 font-mono text-[11px]">{s.file_path}</span>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Revisions */}
            {revisions.length > 0 && (
              <section>
                <div className="text-[13px] font-bold mb-3">Revision Requests ({revisions.length}/3)</div>
                <div className="flex flex-col gap-2">
                  {revisions.map((r) => (
                    <div
                      key={r.uuid}
                      className="rounded-xl border p-4"
                      style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}
                    >
                      <div className="text-[11px] text-gray-500 mb-2">{new Date(r.created_at).toLocaleString()}</div>
                      <div className="text-[13px] text-gray-300 whitespace-pre-wrap leading-relaxed">{r.changes}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Bids list */}
            {(isStudent || isAdmin) && (
              <section>
                <div className="text-[13px] font-bold mb-3">Bids ({bids.length})</div>
                {bids.length === 0 ? (
                  <div
                    className="rounded-xl border p-8 text-center text-gray-500 text-sm"
                    style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}
                  >
                    No bids yet — verified writers will bid shortly.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {bids.map((b) => (
                      <div
                        key={b.uuid}
                        className="rounded-xl border p-4 flex justify-between items-center"
                        style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm">{b.writer_name}</span>
                            <UserBadges points={b.writer_points} created_at={b.writer_joined} />
                          </div>
                          <div className="text-[11px] text-gray-500 mb-1">
                            {b.writer_points} pts · placed {new Date(b.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-[13px] font-semibold">
                            ${Number(b.offered_price).toFixed(0)} · by {new Date(b.offered_deadline).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              b.status === 'ACCEPTED'
                                ? 'bg-green-500/15 text-green-300 border-green-500/25'
                                : b.status === 'REJECTED'
                                ? 'bg-red-500/15 text-red-300 border-red-500/25'
                                : 'bg-gray-500/15 text-gray-300 border-gray-500/25'
                            }`}
                          >
                            {b.status}
                          </span>
                          {isStudent && b.status === 'PENDING' && ['OPEN', 'BIDDING'].includes(order.status) && (
                            <Link
                              href={`/orders/${order.uuid}/pay/${b.uuid}`}
                              className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-indigo-500 hover:bg-indigo-400 transition"
                            >
                              Accept &amp; Pay
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
