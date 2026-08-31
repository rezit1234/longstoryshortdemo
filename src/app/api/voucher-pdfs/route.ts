import { NextResponse } from "next/server";
import { canManageTeam } from "@/lib/auth";
import { getSessionProfile } from "@/lib/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 10 * 1024 * 1024;

function createFileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "poukaz";
  return base.replace(/[^\w\u00C0-\u017F.-]+/g, " ").trim().slice(0, 120);
}

export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canManageTeam(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění nahrávat PDF šablony." },
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
    return NextResponse.json({ error: "Nahrajte PDF soubor." }, { status: 400 });
  }

  const uploadFile = file as File;
  const fileName = uploadFile.name || "poukaz.pdf";
  const fileSize = uploadFile.size || 0;
  let fileType = uploadFile.type || "";

  if (!fileType) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") fileType = "application/pdf";
  }

  if (fileType !== "application/pdf") {
    return NextResponse.json(
      { error: "Povolený formát je pouze PDF." },
      { status: 400 },
    );
  }

  if (fileSize > MAX_BYTES) {
    return NextResponse.json(
      { error: "PDF může mít maximálně 10 MB." },
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

  const path = `templates/${experienceId}/${createFileId()}.pdf`;
  const buffer = Buffer.from(await uploadFile.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("voucher-pdfs")
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("voucher-pdfs").getPublicUrl(path);

  return NextResponse.json({
    pdf: {
      url: publicUrl,
      fileName: `${sanitizeFileName(fileName)}.pdf`,
    },
  });
}
