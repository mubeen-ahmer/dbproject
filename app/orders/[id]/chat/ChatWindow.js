'use client';

import { useEffect, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import { sendMessage } from './actions';

function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ChatWindow({ orderId, currentUserId, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  // Subscribe to real-time inserts on this order's chat
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`chat:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // avoid duplicates from the optimistic add below
            if (prev.some((m) => m.uuid === payload.new.uuid)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [orderId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    const msg = text.trim();
    setText('');

    const fd = new FormData();
    fd.set('order_id', orderId);
    fd.set('text', msg);
    const result = await sendMessage(fd);

    if (result?.error) {
      setError(result.error);
      setText(msg); // restore on failure
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div key={m.uuid} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                isMine
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/10 text-gray-200'
              }`}>
                {!isMine && m.sender_name && (
                  <div className="text-xs text-gray-400 mb-1 font-medium">{m.sender_name}</div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
              </div>
              <div className="text-[10px] text-gray-600 mt-0.5 px-1">
                {formatTime(m.time)}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
          }}
          placeholder="Type a message… (Enter to send)"
          maxLength={2000}
          className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 px-4 py-2 rounded text-sm"
        >
          Send
        </button>
      </form>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
