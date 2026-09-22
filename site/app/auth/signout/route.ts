import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/app/lib/supabase-server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
