import { NextResponse } from "next/server";
import {
  isValidPassword,
  isValidUsername,
  MIN_PASSWORD_LENGTH,
  normalizeUsername,
  usernameToEmail,
  type AdminProfile,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * One-time bootstrap: creates the first owner when admin_profiles is empty.
 * POST { name, username, password }
 */
export async function POST(request: Request) {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Chybí SUPABASE_SERVICE_ROLE_KEY v .env.local.",
      },
      { status: 500 },
    );
  }

  const { count, error: countError } = await admin
    .from("admin_profiles")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Bootstrap už byl použit — tým není prázdný." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    username?: string;
    password?: string;
  } | null;

  const name = body?.name?.trim() || "Long Story Short";
  const username = normalizeUsername(body?.username || "owner");
  const password = body?.password ?? "";

  if (!password || !isValidPassword(password)) {
    return NextResponse.json(
      { error: `Zadejte heslo (min. ${MIN_PASSWORD_LENGTH} znaky).` },
      { status: 400 },
    );
  }

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Neplatné přihlašovací jméno." },
      { status: 400 },
    );
  }

  const email = usernameToEmail(username);
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        username,
        role: "owner",
      },
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Účet se nepodařilo vytvořit." },
      { status: 500 },
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .insert({
      id: created.user.id,
      username,
      full_name: name,
      role: "owner",
    })
    .select("id, username, full_name, role, created_at, avatar_url")
    .single();

  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: profileError?.message ?? "Profil se nepodařilo uložit." },
      { status: 500 },
    );
  }

  const row = profile as AdminProfile;

  return NextResponse.json({
    ok: true,
    member: {
      id: row.id,
      name: row.full_name,
      username: row.username,
      role: row.role,
    },
    loginHint: {
      username: row.username,
      note: "Teď se můžeš přihlásit na /login.",
    },
  });
}
