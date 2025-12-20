import { db } from "../db/index.js";
import { conversations } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export type Role = "user" | "assistant";

export type ConversationRow = {
  id: string;
  session_id: string;
  role: Role;
  content: string;
  sequence: number;
  created_at: Date;
};

/**
 * Fetch last 10 conversations (balanced user + assistant)
 * Returned in chronological order
 */
export async function last10Conversation(
  session_id: string
): Promise<ConversationRow[]> {
  const recentMessages = await db
    .select()
    .from(conversations)
    .where(eq(conversations.session_id, session_id))
    .orderBy(desc(conversations.sequence))
    .limit(20);

  if (!recentMessages.length) return [];

  // 🔒 Explicit runtime narrowing
  const normalized: ConversationRow[] = recentMessages
    .filter(
      (m): m is ConversationRow =>
        m.role === "user" || m.role === "assistant"
    )
    .map(m => ({
      id: m.id,
      session_id: m.session_id,
      role: m.role, // now safely narrowed
      content: m.content,
      sequence: m.sequence,
      created_at: m.created_at,
    }));

  const userMessages = normalized.filter(m => m.role === "user").slice(0, 5);
  const assistantMessages = normalized
    .filter(m => m.role === "assistant")
    .slice(0, 5);

  let merged = [...userMessages, ...assistantMessages];

  if (merged.length > 10) merged = merged.slice(0, 10);

  // chronological order
  merged.sort((a, b) => a.sequence - b.sequence);

  return merged;
}

export function conversationsToString(
  conversations: ConversationRow[]
): string {
  if (!conversations.length) return "N/A";

  return conversations
    .map(c => `${c.role.toUpperCase()}: ${c.content}`)
    .join("\n");
}