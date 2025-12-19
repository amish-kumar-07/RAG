import { db } from "../db/index.js";
import { files } from "../db/schema.js";

export async function createFileMetaDate(
  clerk_id :string,
  original_name : string,
  file_type : string,
  file_size :string,
  s3_url : string
) {
  const [file] = await db
    .insert(files)
    .values({
      clerk_id,
      original_name,
      file_type,
      file_size,
      s3_url,
    })
    .returning();

  return file?.id;
}
