import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log("Uploading to bucket rag-files in project:", process.env.SUPABASE_URL);

  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are missing");
  }

  return createClient(url, serviceKey);
}
