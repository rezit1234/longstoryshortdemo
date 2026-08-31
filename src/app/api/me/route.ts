import { NextResponse } from "next/server";
import {
  ADMIN_ROLE_LABELS,
  isValidPassword,
  isValidUsername,
  MIN_PASSWORD_LENGTH,
  normalizeUsername,
  usernameToEmail,
  type AdminProfile,
  type AdminRole,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function profileResponse(profile: AdminProfile, email: string) {
  return {
    id: profile.id,
    name: profile.full_name,
    username: profile.username,
    role: profile.role as AdminRole,
    roleLabel: ADMIN_ROLE_LABELS[profile.role as AdminRole],
    email,
    avatarUrl: profile.avatar_url,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, username, full_name, role, created_at, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Profil administrátora nebyl nalezen." },
      { status: 404 },
    );
  }

  return NextResponse.json(profileResponse(data as AdminProfile, user.email ?? ""));
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: "name" | "username" | "password";
    name?: string;
    username?: string;
    password?: string;
    oldPassword?: string;
    newPassword?: string;
  } | null;

  if (!body?.action) {
    return NextResponse.json({ error: "Chybí akce." }, { status: 400 });
  }

  const { data: currentProfile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("id, username, full_name, role, created_at, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!currentProfile) {
    return NextResponse.json(
      { error: "Profil administrátora nebyl nalezen." },
      { status: 404 },
    );
  }

  const profile = currentProfile as AdminProfile;
  const currentEmail = user.email || usernameToEmail(profile.username);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Chybí SUPABASE_SERVICE_ROLE_KEY v .env.local." },
      { status: 500 },
    );
  }

  if (body.action === "name") {
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json(
        { error: "Jméno nemůže být prázdné." },
        { status: 400 },
      );
    }

    const { data: updated, error } = await admin
      .from("admin_profiles")
      .update({ full_name: name })
      .eq("id", user.id)
      .select("id, username, full_name, role, created_at, avatar_url")
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message ?? "Jméno se nepodařilo uložit." },
        { status: 500 },
      );
    }

    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        full_name: name,
        username: profile.username,
        role: profile.role,
      },
    });

    return NextResponse.json(
      profileResponse(updated as AdminProfile, currentEmail),
    );
  }

  if (body.action === "username") {
    const username = normalizeUsername(body.username ?? "");
    const password = body.password ?? "";

    if (!username) {
      return NextResponse.json(
        { error: "Přihlašovací jméno nemůže být prázdné." },
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

    if (!password.trim()) {
      return NextResponse.json(
        { error: "Pro změnu přihlašovacího jména zadejte heslo." },
        { status: 400 },
      );
    }

    if (username === profile.username) {
      return NextResponse.json(profileResponse(profile, currentEmail));
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password,
    });

    if (verifyError) {
      return NextResponse.json(
        { error: "Zadané heslo není správné." },
        { status: 401 },
      );
    }

    const { data: taken } = await admin
      .from("admin_profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();

    if (taken) {
      return NextResponse.json(
        { error: "Toto přihlašovací jméno už někdo používá." },
        { status: 409 },
      );
    }

    const nextEmail = usernameToEmail(username);
    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
      email: nextEmail,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name,
        username,
        role: profile.role,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const { data: updated, error } = await admin
      .from("admin_profiles")
      .update({ username })
      .eq("id", user.id)
      .select("id, username, full_name, role, created_at, avatar_url")
      .single();

    if (error || !updated) {
      await admin.auth.admin.updateUserById(user.id, {
        email: currentEmail,
        email_confirm: true,
      });
      return NextResponse.json(
        { error: error?.message ?? "Přihlašovací jméno se nepodařilo uložit." },
        { status: error?.code === "23505" ? 409 : 500 },
      );
    }

    return NextResponse.json(
      profileResponse(updated as AdminProfile, nextEmail),
    );
  }

  if (body.action === "password") {
    const oldPassword = body.oldPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!oldPassword.trim()) {
      return NextResponse.json(
        { error: "Zadejte současné heslo." },
        { status: 400 },
      );
    }

    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        {
          error: `Nové heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaky.`,
        },
        { status: 400 },
      );
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: oldPassword,
    });

    if (verifyError) {
      return NextResponse.json(
        { error: "Současné heslo není správné." },
        { status: 401 },
      );
    }

    const { error: passwordError } = await admin.auth.admin.updateUserById(
      user.id,
      { password: newPassword },
    );

    if (passwordError) {
      return NextResponse.json(
        { error: passwordError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(profileResponse(profile, currentEmail));
  }

  return NextResponse.json({ error: "Neznámá akce." }, { status: 400 });
}
