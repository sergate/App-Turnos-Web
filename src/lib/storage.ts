import type { SupabaseClient } from "@supabase/supabase-js";

export const REMITOS_BUCKET = "remitos";

export async function getSignedRemitoUrl(
  supabase: SupabaseClient,
  path: string | null,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(REMITOS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}
