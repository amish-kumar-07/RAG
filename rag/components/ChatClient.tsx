'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

type Message = {
  id: string;
  sender: 'me' | 'them';
  text: string;
  at: string;
};

type APIMessage = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sequence: number;
  created_at: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

export default function ChatClient({ chatId, fileInfoId }: { chatId?: string; fileInfoId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { getToken } = useAuth();

  // Fetch messages on component mount
  useEffect(() => {
    if (chatId) {
      fetchMessages();
    }
  }, [chatId]);

  // Scroll to bottom on messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Early return if chatId is missing
  if (!chatId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-lg font-semibold">Error: Chat ID is missing</div>
          <div className="text-slate-500 text-sm">Please check the URL and try again.</div>
        </div>
      </div>
    );
  }

  // Convert API message format to UI message format
  function convertToUIMessage(apiMessage: APIMessage): Message {
    return {
      id: apiMessage.id,
      sender: apiMessage.role === 'user' ? 'me' : 'them',
      text: apiMessage.content,
      at: apiMessage.created_at,
    };
  }

  // Format message with proper line breaks and bullet points
  function formatMessage(text: string): string {
    return text
      // Convert markdown-style bullet points to HTML
      .replace(/^\*\s+(.+)$/gm, '<div class="flex items-start gap-2 ml-4"><span class="text-indigo-400 mt-1">•</span><span>$1</span></div>')
      // Convert indented bullet points (nested)
      .replace(/^\s{2,}\*\s+(.+)$/gm, '<div class="flex items-start gap-2 ml-8"><span class="text-indigo-300 mt-1">◦</span><span>$1</span></div>')
      // Convert double line breaks to paragraphs
      .replace(/\n\n/g, '<div class="h-3"></div>')
      // Convert single line breaks
      .replace(/\n/g, '<br />')
      // Bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      // Headers (##)
      .replace(/^##\s+(.+)$/gm, '<div class="font-semibold text-lg mt-2 mb-1">$1</div>')
      // Code blocks
      .replace(/`([^`]+)`/g, '<code class="bg-slate-900/50 px-2 py-0.5 rounded text-indigo-300 text-sm font-mono">$1</code>');
  }

  // Fetch all messages for this session
  async function fetchMessages() {
    if (!chatId) return;

    setLoading(true);
    try {
      const token = await getToken();

      const response = await fetch(`${BASE_URL}/message?session_id=${chatId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const result = await response.json();

      if (result.data && Array.isArray(result.data)) {
        const uiMessages = result.data.map(convertToUIMessage);
        setMessages(uiMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !chatId || !fileInfoId) return;

    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      sender: 'me',
      text: trimmed,
      at: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((m) => [...m, tempMsg]);
    setText('');
    setSending(true);
    setIsTyping(true);

    try {
      const token = await getToken();

      // Send message to your /chat endpoint
      const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: trimmed,
          session_id: chatId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data: APIMessage = await response.json();

      // ✅ FIXED: Backend now returns ONLY the assistant message
      // Replace temp user message with confirmed user message
      setMessages((m) =>
        m.map((msg) =>
          msg.id === tempMsg.id
            ? { ...tempMsg, id: 'user-' + Date.now() } // Confirm user message with new ID
            : msg
        )
      );

      // Add AI response (backend returns assistant message directly)
      const aiMessage = convertToUIMessage(data);
      setMessages((m) => [...m, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages((m) => m.filter((msg) => msg.id !== tempMsg.id));
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      setIsTyping(false);
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
          <div className="text-xs text-slate-400">Active now • Chat ID: {chatId?.slice(0, 8) || 'N/A'}...</div>
        </div>
        <button className="text-slate-400 hover:text-slate-300 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <svg className="w-10 h-10 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div className="text-slate-400">Loading conversation...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-slate-300 text-lg font-semibold">Start a conversation</div>
              <div className="text-slate-500 text-sm mt-1">Ask me anything about your document! 👋</div>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'them' && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0 shadow-lg shadow-blue-500/20">
                  AI
                </div>
              )}

              <div className={`max-w-[75%] flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-3 leading-relaxed transition-all duration-300 ${m.sender === 'me'
                      ? 'bg-gradient-to-br from-blue-500/80 via-indigo-500/80 to-purple-500/80 text-white rounded-xl rounded-br-none shadow-lg shadow-indigo-500/20 backdrop-blur-xl'
                      : 'bg-slate-800/40 text-slate-200 rounded-xl rounded-bl-none border border-slate-700/40 backdrop-blur-xl'
                    }`}
                >
                  <div
                    className="whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{
                      __html: formatMessage(m.text)
                    }}
                  />
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
          ))
        )}

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
            onClick={() => alert('Attachment feature coming soon')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            disabled={sending || loading}
            className="flex-1 rounded-xl bg-slate-900/70 border border-slate-700/40 px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            type="submit"
            disabled={sending || !text.trim() || loading || !fileInfoId}
            className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${sending || !text.trim() || loading || !fileInfoId
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