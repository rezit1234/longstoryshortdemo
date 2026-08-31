import { NextResponse } from "next/server";
import {
  ASSIGNABLE_ROLES,
  canManageTeam,
  type AdminProfile,
  type AdminRole,
} from "@/lib/auth";
import { getSessionProfile } from "@/lib/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSessionProfile();

  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canManageTeam(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění měnit role." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    role?: string;
  } | null;

  const nextRole = body?.role as AdminRole | undefined;

  if (!nextRole || !ASSIGNABLE_ROLES.includes(nextRole as "admin" | "staff")) {
    return NextResponse.json(
      { error: "Role musí být Admin nebo Obsluha." },
      { status: 400 },
    );
  }

  if (session.userId === id) {
    return NextResponse.json(
      { error: "Vlastní roli nelze změnit touto cestou." },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Chybí SUPABASE_SERVICE_ROLE_KEY v .env.local." },
      { status: 500 },
    );
  }

  const { data: target, error: targetError } = await admin
    .from("admin_profiles")
    .select("id, username, full_name, role, created_at, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: "Člen nebyl nalezen." }, { status: 404 });
  }

  const profile = target as AdminProfile;

  if (profile.role === "owner") {
    return NextResponse.json(
      { error: "Roli vlastníka nelze změnit." },
      { status: 400 },
    );
  }

  if (profile.role === nextRole) {
    return NextResponse.json({ member: mapProfile(profile) });
  }

  const { data: updated, error: updateError } = await admin
    .from("admin_profiles")
    .update({ role: nextRole })
    .eq("id", id)
    .select("id, username, full_name, role, created_at, avatar_url")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Roli se nepodařilo změnit." },
      { status: 500 },
    );
  }

  await admin.auth.admin.updateUserById(id, {
    user_metadata: {
      full_name: profile.full_name,
      username: profile.username,
      role: nextRole,
    },
  });

  return NextResponse.json({ member: mapProfile(updated as AdminProfile) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSessionProfile();

  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canManageTeam(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění odebírat členy." },
      { status: 403 },
    );
  }

  if (session.userId === id) {
    return NextResponse.json(
      { error: "Nemůžete odebrat sami sebe." },
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
          "Chybí SUPABASE_SERVICE_ROLE_KEY v .env.local. Bez něj nelze mazat účty.",
      },
      { status: 500 },
    );
  }

  const { data: target, error: targetError } = await admin
    .from("admin_profiles")
    .select("id, role, full_name")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: "Člen nebyl nalezen." }, { status: 404 });
  }

  if (target.role === "owner") {
    return NextResponse.json(
      { error: "Vlastníka nelze odebrat." },
      { status: 400 },
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    removedName: target.full_name as string,
  });
}
