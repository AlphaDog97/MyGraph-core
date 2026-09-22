import { redirect } from "next/navigation";
import { syncUserProfile } from "@/app/lib/auth";
import { createServerSupabaseClient } from "@/app/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") ?? "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/";

  if (!code) redirect("/login?error=登录链接无效");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "登录失败")}`);
  }
  await syncUserProfile(data.user);
  redirect(next);
}
