import { db } from "../db/index.js";
import { conversations } from "../db/schema.js";
import { eq, max , asc} from "drizzle-orm";

/**
 * Saves a conversation message with automatic sequence numbering
 * @param session_id - The session UUID
 * @param role - Either "user" or "assistant"
 * @param content - The message content
 * @returns The saved conversation record
 */
async function saveConversation(
  session_id: string,
  role: string,
  content: string,
) {
  try {
    // Get the highest sequence number for this session from database
    const result = await db
      .select({ maxSeq: max(conversations.sequence) })
      .from(conversations)
      .where(eq(conversations.session_id, session_id))
      .limit(1);

    // Calculate next sequence (starts at 1 if no messages exist)
    const nextSequence = (result[0]?.maxSeq ?? 0) + 1;

    // Insert the conversation with the calculated sequence
    const [savedConversation] = await db
      .insert(conversations)
      .values({
        session_id,
        role,
        content,
        sequence: nextSequence,
        created_at: new Date(),
      })
      .returning();

    console.log(`Saved ${role} message with sequence ${nextSequence}`);
    return savedConversation;
  } catch (error) {
    console.error("Error saving conversation:", error);
    throw new Error("Failed to save conversation");
  }
}

/**
 * Gets ALL conversations for a session in chronological order
 * @param session_id - The session UUID
 * @returns Array of all conversation messages ordered by sequence
 */
async function getConversations(session_id: string) {
  try {
    const response = await db
      .select()
      .from(conversations)
      .where(eq(conversations.session_id, session_id))
      .orderBy(asc(conversations.sequence)); // ✅ Order by sequence ascending

    return response;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw new Error("Failed to fetch conversations");
  }
}

/**
 * Gets a SINGLE conversation by its ID (not session_id)
 * @param conversation_id - The specific conversation UUID
 * @returns Single conversation record or null
 */
async function getConversationById(conversation_id: string) {
  try {
    const [response] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversation_id))
      .limit(1);

    return response || null;
  } catch (error) {
    console.error("Error fetching conversation by ID:", error);
    throw new Error("Failed to fetch conversation");
  }
}

export { saveConversation, getConversations, getConversationById };