import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db/audit";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from "@/lib/utils/errors";
import {
  CATALOG_HEADER_CARDS_KEY,
  getCatalogHeaderCardContexts,
  getCatalogHeaderDestinations,
  parseCatalogHeaderCardConfig,
} from "@/lib/navigation/catalog-header-cards";

export const dynamic = "force-dynamic";

async function readConfig() {
  const row = await prisma.storeConfig.findUnique({
    where: { key: CATALOG_HEADER_CARDS_KEY },
  });
  if (!row) return parseCatalogHeaderCardConfig(null);

  try {
    return parseCatalogHeaderCardConfig(JSON.parse(row.value));
  } catch {
    return parseCatalogHeaderCardConfig(null);
  }
}

export const GET = withLoggedAdminHandler(async (req: Request) => {
  try {
    const access = await requireAdminApiAccess(req);
    if (!access.ok) return access.response;

    const config = await readConfig();
    return NextResponse.json({
      contexts: getCatalogHeaderCardContexts(config),
      destinations: getCatalogHeaderDestinations(),
    });
  } catch (error) {
    console.error("Get catalog header cards error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const PUT = withLoggedAdminHandler(async (req: Request) => {
  try {
    const access = await requireAdminApiAccess(req);
    if (!access.ok) return access.response;

    const body: unknown = await req.json();
    const rawContexts =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>).contexts
        : null;
    const candidate = parseCatalogHeaderCardConfig({
      version: 1,
      contexts: rawContexts,
    });
    const submittedContextCount =
      rawContexts && typeof rawContexts === "object" && !Array.isArray(rawContexts)
        ? Object.keys(rawContexts).length
        : -1;
    const submittedCardCount =
      rawContexts && typeof rawContexts === "object" && !Array.isArray(rawContexts)
        ? Object.values(rawContexts as Record<string, unknown>).reduce<number>(
            (total, cards) => total + (Array.isArray(cards) ? cards.length : 0),
            0,
          )
        : -1;
    const parsedCardCount = Object.values(candidate.contexts).reduce(
      (total, cards) => total + cards.length,
      0,
    );

    if (
      submittedContextCount < 0 ||
      submittedContextCount !== Object.keys(candidate.contexts).length ||
      submittedCardCount !== parsedCardCount
    ) {
      return NextResponse.json(
        {
          error:
            "One or more cards are invalid. Use an uploaded image and choose a catalog destination from the list.",
        },
        { status: 400 },
      );
    }

    const previous = await readConfig();
    await prisma.storeConfig.upsert({
      where: { key: CATALOG_HEADER_CARDS_KEY },
      create: {
        key: CATALOG_HEADER_CARDS_KEY,
        value: JSON.stringify(candidate),
      },
      update: { value: JSON.stringify(candidate) },
    });

    void createAuditLog({
      userId: access.session.user.id,
      userEmail: access.session.user.email ?? undefined,
      action: "SETTINGS_CHANGED",
      entity: "CatalogHeaderCards",
      entityId: CATALOG_HEADER_CARDS_KEY,
      oldValue: previous,
      newValue: candidate,
    });

    return NextResponse.json({
      success: true,
      contexts: getCatalogHeaderCardContexts(candidate),
    });
  } catch (error) {
    console.error("Update catalog header cards error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
