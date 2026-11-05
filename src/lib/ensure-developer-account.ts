import {
  normalizeUsername,
  usernameToEmail,
  type AdminRole,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Interní účet — heslo jen z env, nikdy do gitu. */
export function getDeveloperCredentials() {
  const username = normalizeUsername(
    process.env.DEVELOPER_USERNAME?.trim() || "rezit",
  );
  const password = process.env.DEVELOPER_PASSWORD?.trim() || "";
  const fullName = process.env.DEVELOPER_FULL_NAME?.trim() || "Rezit";
  return { username, password, fullName };
}

/**
 * Idempotentně založí / aktualizuje skrytý developerský účet.
 * Vyžaduje DEVELOPER_PASSWORD v env.
 */
export async function ensureDeveloperAccount() {
  const { username, password, fullName } = getDeveloperCredentials();
  if (!password) {
    return {
      ok: false as const,
      reason: "missing_password" as const,
    };
  }

  const admin = createAdminClient();
  const email = usernameToEmail(username);
  const role: AdminRole = "developer";

  const { data: existingProfile } = await admin
    .from("admin_profiles")
    .select("id, username, role")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile?.id) {
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(
      existingProfile.id,
      {
        password,
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          username,
          role,
        },
      },
    );
    if (updateAuthError) {
      throw new Error(updateAuthError.message);
    }

    const { error: profileError } = await admin
      .from("admin_profiles")
      .update({
        full_name: fullName,
        role,
      })
      .eq("id", existingProfile.id);

    if (profileError) {
      throw new Error(profileError.message);
    }

    return {
      ok: true as const,
      action: "updated" as const,
      username,
      id: existingProfile.id as string,
    };
  }

  const { data: listed } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const existingAuth = listed?.users?.find(
    (user) =>
      user.email?.toLowerCase() === email.toLowerCase() ||
      user.user_metadata?.username === username,
  );

  if (existingAuth) {
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(
      existingAuth.id,
      {
        password,
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          username,
          role,
        },
      },
    );
    if (updateAuthError) {
      throw new Error(updateAuthError.message);
    }

    const { error: upsertError } = await admin.from("admin_profiles").upsert({
      id: existingAuth.id,
      username,
      full_name: fullName,
      role,
    });
    if (upsertError) {
      throw new Error(upsertError.message);
    }

    return {
      ok: true as const,
      action: "linked" as const,
      username,
      id: existingAuth.id,
    };
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
        role,
      },
    });

  if (createError || !created.user) {
    throw new Error(createError?.message || "Účet se nepodařilo vytvořit.");
  }

  const { error: profileError } = await admin.from("admin_profiles").insert({
    id: created.user.id,
    username,
    full_name: fullName,
    role,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError.message);
  }

  return {
    ok: true as const,
    action: "created" as const,
    username,
    id: created.user.id,
  };
}
