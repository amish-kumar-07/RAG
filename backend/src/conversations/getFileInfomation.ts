import { db } from "../db/index.js";
import { fileInformation } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function getContext(fileInformationId: string) {
  const [result] = await db
    .select()
    .from(fileInformation)
    .where(eq(fileInformation.id, fileInformationId));

  return result?.full_content ?? null;
}
