'use client';

import React, { useEffect, useRef, useState } from 'react';

type Message = {
  id: string;
  sender: 'me' | 'them';
  text: string;
  at: string; // ISO date
};

export default function ChatClient({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);


  // Scroll to bottom on messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Simulate "other user is typing" when we send a message (for demo)
  function simulateReply(afterMs = 1000) {
    setIsTyping(true);
    setTimeout(() => {
      const reply: Message = {
        id: 'srv-' + Date.now(),
        sender: 'them',
        text: getAutoReply(),
        at: new Date().toISOString(),
      };
      setMessages((m) => [...m, reply]);
      setIsTyping(false);
    }, afterMs);
  }

  function getAutoReply() {
    const replies = [
      "Nice — got it!",
      "I see. Can you tell me more?",
      "On it. I'll check and get back.",
      "Thanks for the update!",
      "Perfect — that works for me.",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: Message = {
      id: 'me-' + Date.now(),
      sender: 'me',
      text: trimmed,
      at: new Date().toISOString(),
    };

    // Optimistic UI
    setMessages((m) => [...m, msg]);
    setText('');
    setSending(true);

    try {
      await fetch(`/api/chat/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      // For demo: simulate a reply from "them"
      simulateReply(900 + Math.random() * 800);
    } catch (err) {
      console.error(err);
      alert('Failed to send — running in demo fallback.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Glass Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-slate-800/40 backdrop-blur-xl border-b border-slate-700/40">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-lg shadow-indigo-500/30">
          AI
        </div>
        <div className="flex-1">
          <div className="font-semibold text-lg bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Chat Assistant
          </div>
          <div className="text-xs text-slate-400">Active now • Chat ID: {chatId}</div>
        </div>
        <button className="text-slate-400 hover:text-slate-300 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-slate-300 text-lg font-semibold">Start a conversation</div>
              <div className="text-slate-500 text-sm mt-1">Say hi and I'll respond! 👋</div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            {m.sender === 'them' && (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0 shadow-lg shadow-blue-500/20">
                AI
              </div>
            )}

            <div className={`max-w-[75%] flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-4 py-3 leading-relaxed whitespace-pre-wrap transition-all duration-300 ${
                  m.sender === 'me'
                    ? 'bg-gradient-to-br from-blue-500/80 via-indigo-500/80 to-purple-500/80 text-white rounded-xl rounded-br-none shadow-lg shadow-indigo-500/20 backdrop-blur-xl'
                    : 'bg-slate-800/40 text-slate-200 rounded-xl rounded-bl-none border border-slate-700/40 backdrop-blur-xl'
                }`}
              >
                {m.text}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 px-1">
                {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {m.sender === 'me' && (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold ml-2 flex-shrink-0 shadow-lg shadow-purple-500/20">
                ME
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-lg shadow-blue-500/20">
              AI
            </div>
            <div className="bg-slate-800/40 backdrop-blur-xl px-4 py-3 rounded-xl rounded-bl-none border border-slate-700/40">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="px-6 py-4 bg-slate-800/40 backdrop-blur-xl border-t border-slate-700/40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full p-2 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-all duration-300"
            onClick={() => alert('Attachment clicked (demo)')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl bg-slate-900/70 border border-slate-700/40 px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300"
          />

          <button
            type="submit"
            disabled={sending || !text.trim()}
            className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${
              sending || !text.trim()
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105'
            }`}
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}