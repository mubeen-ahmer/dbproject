import { getCurrentUser } from '@/lib/auth/user';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import ChatWindow from './ChatWindow';

export const dynamic = 'force-dynamic';

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

  // Load existing messages with sender name joined from users
  const msgsRes = await pool.query(
    `SELECT c.uuid, c.sender_id, c.text, c.time, u.name AS sender_name
     FROM chat c
     JOIN users u ON u.uuid = c.sender_id
     WHERE c.order_id = $1
     ORDER BY c.time ASC`,
    [id]
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href={`/orders/${id}`} className="text-indigo-400 hover:underline text-sm">
        ← Back to order
      </Link>
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-bold">Chat</h1>
        <p className="text-gray-400 text-sm mt-1">
          {order.title} · {order.student_name} &amp; {order.writer_name ?? 'writer'}
        </p>
      </div>

      <div className="max-w-2xl border border-white/10 rounded-lg p-4 bg-white/2">
        <ChatWindow
          orderId={id}
          currentUserId={user.uuid}
          initialMessages={msgsRes.rows}
        />
      </div>
    </div>
  );
}
