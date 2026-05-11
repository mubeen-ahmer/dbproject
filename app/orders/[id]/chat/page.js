import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import ChatWindow from './ChatWindow';

export const dynamic = 'force-dynamic';

function initialsOf(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default async function ChatPage({ params }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const orderRes = await pool.query(
    `SELECT o.uuid, o.title, o.student_id, o.writer_id,
            stu.name AS student_name, wri.name AS writer_name
     FROM orders o
     JOIN users stu ON stu.uuid = o.student_id
     LEFT JOIN users wri ON wri.uuid = o.writer_id
     WHERE o.uuid = $1`,
    [id]
  );
  if (orderRes.rows.length === 0) notFound();
  const order = orderRes.rows[0];

  const isParticipant =
    user.uuid === order.student_id ||
    user.uuid === order.writer_id ||
    user.role === 'admin';
  if (!isParticipant) redirect('/');

  const msgsRes = await pool.query(
    `SELECT c.uuid, c.sender_id, c.text, c.time, u.name AS sender_name
     FROM chat c
     JOIN users u ON u.uuid = c.sender_id
     WHERE c.order_id = $1
     ORDER BY c.time ASC`,
    [id]
  );

  const otherName =
    user.uuid === order.student_id
      ? order.writer_name || 'Writer (not yet assigned)'
      : order.student_name;

  return (
    <div className="min-h-screen bg-[#0f1724] text-white flex flex-col">
      {/* Top nav */}
      <div
        className="h-14 flex items-center px-6 gap-3 flex-shrink-0 border-b"
        style={{ background: '#0a0f1a', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <Link href={`/orders/${id}`} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to order
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-gray-400 flex-1 truncate">{order.title}</span>
        <div
          className="font-mono text-[11px] text-gray-500 rounded-md px-2.5 py-0.5 border flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {order.uuid.slice(0, 8).toUpperCase()}
        </div>
      </div>

      {/* Chat card */}
      <div className="flex-1 flex items-stretch justify-center p-6 overflow-hidden">
        <div
          className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden"
          style={{ background: '#141e2e', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 border-b flex items-center gap-3 flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <div
              className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
              style={{
                width: 42,
                height: 42,
                fontSize: 15,
                background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                letterSpacing: '-0.02em',
              }}
            >
              {initialsOf(otherName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{otherName}</div>
              <div className="text-[11px] text-green-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
                Online
              </div>
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Order chat</div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              orderId={id}
              currentUserId={user.uuid}
              otherName={otherName}
              initialMessages={msgsRes.rows}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
