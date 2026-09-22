import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getD1 } from "@/db";
import { RequestError } from "./route-utils";
import { createServerSupabaseClient } from "./supabase-server";

export type SignedInUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  provider: string;
};

function toSignedInUser(user: User): SignedInUser {
  const metadata = user.user_metadata ?? {};
  const email = user.email ?? "";
  const displayName =
    metadata.full_name ??
    metadata.name ??
    metadata.user_name ??
    email.split("@")[0] ??
    "MyGraph 用户";
  const provider =
    user.app_metadata?.provider ?? user.identities?.[0]?.provider ?? "email";

  return {
    id: user.id,
    email,
    displayName: String(displayName),
    avatarUrl:
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    provider: String(provider),
  };
}

export async function syncUserProfile(user: User) {
  const profile = toSignedInUser(user);
  await getD1()
    .prepare(
      `INSERT INTO users
        (id, email, provider, display_name, avatar_url, last_login_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         provider = excluded.provider,
         display_name = excluded.display_name,
         avatar_url = excluded.avatar_url,
         updated_at = CURRENT_TIMESTAMP,
         last_login_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      profile.id,
      profile.email || null,
      profile.provider,
      profile.displayName,
      profile.avatarUrl,
    )
    .run();
  return profile;
}

export async function requirePageUser(): Promise<SignedInUser> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return syncUserProfile(data.user);
}

export async function requireApiUser() {
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    throw new RequestError("Supabase 尚未配置", 503);
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new RequestError("请先登录", 401);
  return data.user;
}
