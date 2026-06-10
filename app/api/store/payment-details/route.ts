import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    nayapayAccount: process.env.NAYAPAY_ACCOUNT || "samar.abbas636@nayapay",
    nayapayName: process.env.NAYAPAY_NAME || "Samar Abbas",
    nayapayPhone: process.env.NAYAPAY_PHONE || "+92 302 2996677",
    meezanIban: process.env.MEEZAN_IBAN || "PK51MEZN0003260114999042",
    meezanAccountName: process.env.MEEZAN_ACCOUNT_NAME || "EMAN THREAD",
    meezanBranch: process.env.MEEZAN_BRANCH || "Meezan Bank",
    meezanAccountNumber: process.env.MEEZAN_ACCOUNT_NUMBER || "03260114999042",
  });
}
