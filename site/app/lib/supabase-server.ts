import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./supabase-config";

export async function createServerSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase 尚未配置");
  }

  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Route handlers and the
          // browser client keep the session refreshed when writes are allowed.
        }
      },
    },
  });
}
