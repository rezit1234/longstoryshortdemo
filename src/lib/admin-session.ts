import {
  ADMIN_ROLE_LABELS,
  type AdminProfile,
  type AdminRole,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function getSessionProfile(): Promise<{
  userId: string;
  profile: AdminProfile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, username, full_name, role, created_at, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: user.id,
    profile: data as AdminProfile,
  };
}

export function roleLabel(role: AdminRole) {
  return ADMIN_ROLE_LABELS[role];
}
