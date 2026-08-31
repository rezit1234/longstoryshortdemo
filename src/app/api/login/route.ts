import { NextResponse } from "next/server";
import { usernameToEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;

  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Zadejte uživatelské jméno i heslo." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const email = usernameToEmail(username);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: "Neplatné přihlašovací údaje." },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
