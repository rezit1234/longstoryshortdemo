import { NextResponse } from "next/server";
import { canManageTeam } from "@/lib/auth";
import { getSessionProfile } from "@/lib/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

function createFileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canManageTeam(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění nahrávat obrázky poukazů." },
      { status: 403 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const experienceIdRaw = form?.get("experienceId");
  const experienceId =
    typeof experienceIdRaw === "string" && experienceIdRaw.trim()
      ? experienceIdRaw.trim().replace(/[^a-zA-Z0-9._-]/g, "-")
      : "shared";

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Nahrajte obrázek." }, { status: 400 });
  }

  const uploadFile = file as File;
  const fileName = uploadFile.name || "image";
  const fileSize = uploadFile.size || 0;
  let fileType = uploadFile.type || "";

  if (!fileType) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg") fileType = "image/jpeg";
    else if (ext === "png") fileType = "image/png";
    else if (ext === "webp") fileType = "image/webp";
    else if (ext === "gif") fileType = "image/gif";
  }

  if (!ALLOWED_TYPES.has(fileType)) {
    return NextResponse.json(
      { error: "Povolené formáty: JPG, PNG, WEBP, GIF." },
      { status: 400 },
    );
  }

  if (fileSize > MAX_BYTES) {
    return NextResponse.json(
      { error: "Obrázek může mít maximálně 5 MB." },
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

  const ext = extensionForMime(fileType);
  const path = `gallery/${experienceId}/${createFileId()}.${ext}`;
  const buffer = Buffer.from(await uploadFile.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("voucher-images")
    .upload(path, buffer, {
      contentType: fileType,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("voucher-images").getPublicUrl(path);

  const altFromName = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return NextResponse.json({
    image: {
      src: publicUrl,
      alt: altFromName || "Fotografie varianty",
    },
  });
}
