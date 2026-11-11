import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import { getSessionProfile } from "@/lib/admin-session";
import { canRedeemVoucher } from "@/lib/auth";
import {
  REDEMPTION_NOTE_MAX_LENGTH,
  redeemSoldVoucher,
  type RedeemAction,
} from "@/lib/redeem-sold-voucher";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ACTIONS: RedeemAction[] = ["full", "amount", "part", "undo"];

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canRedeemVoucher(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění uplatnit poukaz." },
      { status: 403 },
    );
  }

  const { code: rawCode } = await context.params;
  const code = normalizeVoucherCode(decodeURIComponent(rawCode));
  if (!code) {
    return NextResponse.json({ error: "Neplatný kód." }, { status: 400 });
  }

  let body: {
    action?: string;
    amountCzk?: number;
    partId?: string;
    note?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const action = body.action as RedeemAction | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Neplatná akce." }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > REDEMPTION_NOTE_MAX_LENGTH) {
    return NextResponse.json(
      {
        error: `Poznámka je příliš dlouhá (max. ${REDEMPTION_NOTE_MAX_LENGTH} znaků).`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await redeemSoldVoucher({
      note: note || null,
      code,
      action,
      amountCzk: body.amountCzk,
      partId: body.partId,
      createdBy: session.userId,
      actorRole: session.profile.role,
    });

    return NextResponse.json({
      voucher: result.voucher,
      emailSent: result.emailSent,
      emailTo: result.emailTo,
      emailSkippedReason: result.emailSkippedReason,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Uplatnění se nepovedlo.";
    const status =
      message.includes("nenalezen")
        ? 404
        : message.includes("Neplatn") ||
            message.includes("nelze") ||
            message.includes("Nelze") ||
            message.includes("Zadejte") ||
            message.includes("Vyberte") ||
            message.includes("Není co") ||
            message.includes("už je") ||
            message.includes("jen u")
          ? 400
          : 500;
    if (status === 500) {
      console.error("sold-vouchers redeem", error);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
