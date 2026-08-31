import { NextResponse } from "next/server";
import {
  canManageTeam,
  isValidPassword,
  isValidUsername,
  MIN_PASSWORD_LENGTH,
  normalizeUsername,
  usernameToEmail,
  type AdminProfile,
  type AdminRole,
} from "@/lib/auth";
import { getSessionProfile } from "@/lib/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function mapProfile(row: AdminProfile) {
  return {
    id: row.id,
    name: row.full_name,
    username: row.username,
    role: row.role,
    avatarUrl: row.avatar_url,
    joinedAt: new Date(row.created_at).toLocaleDateString("cs-CZ"),
    createdAt: row.created_at,
  };
}

export async function GET() {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canManageTeam(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění zobrazit tým." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, username, full_name, role, created_at, avatar_url")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    members: ((data ?? []) as AdminProfile[]).map(mapProfile),
  });
}

export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canManageTeam(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění přidávat členy." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    username?: string;
    password?: string;
    role?: string;
  } | null;

  const name = body?.name?.trim() ?? "";
  const username = normalizeUsername(body?.username ?? "");
  const password = body?.password ?? "";
  const role = (body?.role ?? "staff") as AdminRole;

  if (!name || !username || !password) {
    return NextResponse.json(
      { error: "Vyplňte jméno, přihlašovací jméno i heslo." },
      { status: 400 },
    );
  }

  if (!isValidUsername(username)) {
    return NextResponse.json(
      {
        error:
          "Přihlašovací jméno musí mít 2–32 znaků (a–z, 0–9, tečka, pomlčka, podtržítko).",
      },
      { status: 400 },
    );
  }

  if (!isValidPassword(password)) {
    return NextResponse.json(
      { error: `Heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaky.` },
      { status: 400 },
    );
  }

  if (role !== "admin" && role !== "staff") {
    return NextResponse.json(
      { error: "Neplatná role." },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Chybí SUPABASE_SERVICE_ROLE_KEY v .env.local. Bez něj nelze vytvářet účty.",
      },
      { status: 500 },
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
        role,
      },
    });

  if (createError || !created.user) {
    const message = createError?.message ?? "Účet se nepodařilo vytvořit.";
    const status =
      message.toLowerCase().includes("already") ||
      message.toLowerCase().includes("registered")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .insert({
      id: created.user.id,
      username,
      full_name: name,
      role,
    })
    .select("id, username, full_name, role, created_at, avatar_url")
    .single();

  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      {
        error:
          profileError?.message ??
          "Profil se nepodařilo uložit. Účet byl zrušen.",
      },
      { status: profileError?.code === "23505" ? 409 : 500 },
    );
  }

  return NextResponse.json({ member: mapProfile(profile as AdminProfile) });
}
