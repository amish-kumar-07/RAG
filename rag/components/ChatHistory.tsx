"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

type Session = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

interface ChatHistoryProps {
  refreshTrigger?: number; // Pass a number that changes to trigger refresh
}

export default function ChatHistory({ refreshTrigger }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  // Fetch sessions on mount and when refreshTrigger changes
  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchSessions();
    }
  }, [isSignedIn, user?.id, refreshTrigger]);

  const fetchSessions = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BASE_URL}/sessions?clerk_id=${user.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60)
      return `${diffMins} ${diffMins === 1 ? "min" : "mins"} ago`;
    if (diffHours < 24)
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return "Last week";
  };

  const getGradientColor = (index: number) => {
    const gradients = [
      "from-blue-500 to-indigo-500",
      "from-purple-500 to-pink-500",
      "from-green-500 to-teal-500",
      "from-orange-500 to-red-500",
      "from-cyan-500 to-blue-500",
      "from-pink-500 to-rose-500",
    ];
    return gradients[index % gradients.length];
  };

  const getShadowColor = (index: number) => {
    const shadows = [
      "shadow-blue-500/20",
      "shadow-purple-500/20",
      "shadow-green-500/20",
      "shadow-orange-500/20",
      "shadow-cyan-500/20",
      "shadow-pink-500/20",
    ];
    return shadows[index % shadows.length];
  };

  if (!isSignedIn) return null;

  return (
    <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700/50">
      <h3 className="text-2xl font-semibold mb-6 text-slate-200">
        Recent Conversations
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg
            className="w-8 h-8 animate-spin text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-900/50 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">No conversations yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Start by uploading a document
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <div
              key={session.id}
              onClick={() => router.push(`/pages/chatpage/${session.id}`)}
              className="group bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/30 hover:border-indigo-500/50 rounded-xl p-4 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br ${getGradientColor(
                    index
                  )} rounded-lg flex items-center justify-center shadow-lg ${getShadowColor(
                    index
                  )}`}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-200 font-medium group-hover:text-indigo-300 transition-colors truncate">
                    {session.title}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {getRelativeTime(session.updated_at || session.created_at)}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}