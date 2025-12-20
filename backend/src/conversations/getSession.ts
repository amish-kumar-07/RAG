import { db } from "../db/index.js";
import { ragSessions } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function getSessionInfo(session_id: string) {
  try {
    if (!session_id) {
      throw new Error("session_id is required");
    }

    const session = await db
      .select()
      .from(ragSessions)
      .where(eq(ragSessions.id, session_id))
      .limit(1);

    if (session.length === 0) {
      throw new Error("Session not found");
    }
    console.log(session[0]);
    return session[0];
  } catch (err) {
    console.error("getSessionInfo error:", err);
    throw err;
  }
}
