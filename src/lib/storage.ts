import type { SupabaseClient } from "@supabase/supabase-js";

export const REMITOS_BUCKET = "remitos";

export async function getSignedRemitoUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(REMITOS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}
