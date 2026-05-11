'use client';

import { useEffect, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import { sendMessage } from './actions';

function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function initialsOf(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ name, size = 28, mine = false }) {
  const grad = mine ? '135deg,#14b8a6,#5eead4' : '135deg,#6366f1,#818cf8';
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(${grad})`,
        letterSpacing: '-0.02em',
      }}
    >
      {initialsOf(name)}
    </div>
  );
}

export default function ChatWindow({ orderId, currentUserId, otherName, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [warn, setWarn] = useState(false);
  const bottomRef = useRef(null);

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
            if (prev.some((m) => m.uuid === payload.new.uuid)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const msg = text.trim();
    if (!msg || sending) return;

    if (/\d{7,}|@[a-z]+\.[a-z]+|https?:\/\//i.test(msg)) {
      setWarn(true);
      setTimeout(() => setWarn(false), 4000);
      return;
    }

    setSending(true);
    setError(null);
    setText('');

    const fd = new FormData();
    fd.set('order_id', orderId);
    fd.set('text', msg);

    try {
      const result = await sendMessage(fd);
      if (result?.error) {
        setError(result.error);
        setText(msg);
      }
    } catch (err) {
      setError(err?.message || 'Failed to send');
      setText(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Context strip */}
      <div
        className="px-5 py-2.5 border-b flex-shrink-0"
        style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="text-[11px] text-gray-500">Chatting with</div>
        <div className="text-[12px] font-semibold text-gray-400">{otherName}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3.5">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">No messages yet. Start the conversation.</div>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div
              key={m.uuid}
              className={`flex gap-2 items-end ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isMine && <Avatar name={m.sender_name || otherName} size={28} mine={false} />}
              <div style={{ maxWidth: '75%' }}>
                {!isMine && m.sender_name && (
                  <div className="text-[10px] text-gray-500 mb-0.5 ml-0.5">{m.sender_name}</div>
                )}
                <div
                  className="px-3 py-2 text-[13px] leading-relaxed text-white whitespace-pre-wrap break-words"
                  style={{
                    background: isMine ? '#6366f1' : 'rgba(255,255,255,0.06)',
                    borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  }}
                >
                  {m.text}
                </div>
                <div
                  className={`text-[10px] text-gray-700 mt-0.5 ${isMine ? 'text-right' : 'text-left'}`}
                >
                  {formatTime(m.time)}
                </div>
              </div>
            </div>
          );
        })}
        {warn && (
          <div
            className="rounded-xl px-3 py-2.5 text-[12px] leading-relaxed"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5',
            }}
          >
            ⚠ Sharing contact info removes your buyer/seller protection. Message not sent.
          </div>
        )}
        {error && (
          <div
            className="rounded-xl px-3 py-2.5 text-[12px] leading-relaxed"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 border-t flex gap-2 items-end flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          maxLength={2000}
          className="flex-1 text-[13px] leading-relaxed text-white placeholder-gray-600 resize-none outline-none px-3 py-2.5 rounded-lg"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          aria-label="Send message"
          className="w-[38px] h-[38px] rounded-lg flex items-center justify-center transition flex-shrink-0 cursor-pointer"
          style={{ background: sending ? '#4338ca' : '#6366f1', opacity: sending ? 0.7 : 1 }}
          onMouseEnter={(e) => {
            if (!sending) e.currentTarget.style.background = '#818cf8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = sending ? '#4338ca' : '#6366f1';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
