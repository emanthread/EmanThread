import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStoreConfig } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getStoreConfig();

  return NextResponse.json({
    nayapayAccount: config.nayapayAccount,
    nayapayName: config.nayapayName,
    nayapayPhone: config.nayapayPhone,
    meezanIban: config.meezanIban,
    meezanAccountName: config.meezanAccountName,
    meezanBranch: process.env.MEEZAN_BRANCH || "Meezan Bank", // kept as env fallback since it's not editable
    meezanAccountNumber: config.meezanAccountNumber,
  });
}
