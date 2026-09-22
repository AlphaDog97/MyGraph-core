import { redirect } from "next/navigation";
import { LoginPanel } from "./login-panel";
import { getSupabaseConfig } from "@/app/lib/supabase-config";
import { createServerSupabaseClient } from "@/app/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const config = getSupabaseConfig();
  if (config) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/");
  }
  const params = await searchParams;
  return <LoginPanel config={config} initialError={params.error} />;
}
