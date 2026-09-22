import { env } from "cloudflare:workers";

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const bindings = env as unknown as Record<string, unknown>;
  const url =
    typeof bindings.SUPABASE_URL === "string"
      ? bindings.SUPABASE_URL
      : process.env.SUPABASE_URL;
  const publishableKey =
    typeof bindings.SUPABASE_PUBLISHABLE_KEY === "string"
      ? bindings.SUPABASE_PUBLISHABLE_KEY
      : process.env.SUPABASE_PUBLISHABLE_KEY ??
        (typeof bindings.SUPABASE_ANON_KEY === "string"
          ? bindings.SUPABASE_ANON_KEY
          : process.env.SUPABASE_ANON_KEY);

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}
