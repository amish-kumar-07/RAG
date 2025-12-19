import { db } from "../db/index.js";
import { ragSessions } from "../db/schema.js";

export async function CreateSession(clerk_id: string,file_id : string ,title?: string) {
  if (!clerk_id) {
    throw new Error("clerk_id is required to create a session");
  }

  const [session] = await db
    .insert(ragSessions)
    .values({
      clerk_id: clerk_id,
      file_id : file_id,
      title: title || "New RAG Session",
    })
    .returning();

  return session;
}
