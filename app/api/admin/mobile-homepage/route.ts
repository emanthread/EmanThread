import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { requireAdminApiAccess } from '@/lib/admin-route-guard';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/db/audit';
import { withLoggedAdminHandler } from '@/lib/logger';
import {
  MOBILE_HOMEPAGE_CONFIG_KEY,
  createDefaultMobileHomepageConfig,
  getMobileHomepageDestinations,
  parseMobileHomepageConfig,
  validateMobileHomepageConfig,
} from '@/lib/mobile-homepage';
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

async function readConfig() {
  const row = await prisma.storeConfig.findUnique({
    where: { key: MOBILE_HOMEPAGE_CONFIG_KEY },
  });
  if (!row) return createDefaultMobileHomepageConfig();
  try {
    return parseMobileHomepageConfig(JSON.parse(row.value));
  } catch {
    return createDefaultMobileHomepageConfig();
  }
}

export const GET = withLoggedAdminHandler(async (request: Request) => {
  try {
    const access = await requireAdminApiAccess(request);
    if (!access.ok) return access.response;
    return NextResponse.json({
      config: await readConfig(),
      destinations: getMobileHomepageDestinations(),
    });
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const PUT = withLoggedAdminHandler(async (request: Request) => {
  try {
    const access = await requireAdminApiAccess(request);
    if (!access.ok) return access.response;
    const body: unknown = await request.json();
    const candidate = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).config
      : null;
    const validation = validateMobileHomepageConfig(candidate);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const previous = await readConfig();
    await prisma.storeConfig.upsert({
      where: { key: MOBILE_HOMEPAGE_CONFIG_KEY },
      create: {
        key: MOBILE_HOMEPAGE_CONFIG_KEY,
        value: JSON.stringify(validation.config),
      },
      update: { value: JSON.stringify(validation.config) },
    });
    void createAuditLog({
      userId: access.session.user.id,
      userEmail: access.session.user.email ?? undefined,
      action: 'SETTINGS_CHANGED',
      entity: 'MobileHomepage',
      entityId: MOBILE_HOMEPAGE_CONFIG_KEY,
      oldValue: previous,
      newValue: validation.config,
    });
    revalidateTag('mobile-homepage', { expire: 0 });
    revalidatePath('/', 'page');
    return NextResponse.json({ success: true, config: validation.config });
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
