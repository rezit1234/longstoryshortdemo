import { NextResponse } from "next/server";
import {
  ADMIN_ROLE_LABELS,
  type AdminProfile,
  type AdminRole,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

function extensionForMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Nahrajte obrázek profilu." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Povolené formáty: JPG, PNG, WEBP, GIF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Obrázek může mít maximálně 2 MB." },
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

  const ext = extensionForMime(file.type);
  const path = `${user.id}/avatar.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("avatars").getPublicUrl(path);

  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { data: updated, error: updateError } = await admin
    .from("admin_profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select("id, username, full_name, role, created_at, avatar_url")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Profilovku se nepodařilo uložit." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    profileResponse(updated as AdminProfile, user.email ?? ""),
  );
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
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

  const { data: files } = await admin.storage.from("avatars").list(user.id);
  if (files?.length) {
    await admin.storage
      .from("avatars")
      .remove(files.map((file) => `${user.id}/${file.name}`));
  }

  const { data: updated, error: updateError } = await admin
    .from("admin_profiles")
    .update({ avatar_url: null })
    .eq("id", user.id)
    .select("id, username, full_name, role, created_at, avatar_url")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Výchozí profilovku se nepodařilo nastavit." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    profileResponse(updated as AdminProfile, user.email ?? ""),
  );
}
