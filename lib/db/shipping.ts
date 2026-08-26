import { prisma } from "@/lib/db";
import { getStoreConfig } from "@/lib/db/store-config";
import {
  calculateShippingCost,
  normalizeShippingLocation,
  selectShippingZone,
  type ShippingZoneCandidate,
} from "@/lib/shipping-quote";

function parseLocations(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function toCandidate(zone: {
  id: string;
  name: string;
  cities: string;
  provinces: string;
  shippingRate: unknown;
  estimatedDays: string;
}): ShippingZoneCandidate {
  return {
    id: zone.id,
    name: zone.name,
    cities: parseLocations(zone.cities),
    provinces: parseLocations(zone.provinces),
    shippingRate: Number(zone.shippingRate),
    estimatedDays: zone.estimatedDays,
  };
}

export async function getShippingZones() {
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return zones.map((zone) => ({
    ...toCandidate(zone),
    isActive: zone.isActive,
    createdAt: zone.createdAt.toISOString(),
  }));
}

export async function getAllShippingZones() {
  const zones = await prisma.shippingZone.findMany({
    where: { deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return zones.map((zone) => ({
    ...toCandidate(zone),
    isActive: zone.isActive,
    createdAt: zone.createdAt.toISOString(),
  }));
}

export async function getZoneForCity(
  city: string,
  province: string,
  fallbackRate = 350,
) {
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const selected = selectShippingZone(zones.map(toCandidate), city, province);

  return selected ?? {
    id: "default",
    name: "Rest of Pakistan",
    cities: [],
    provinces: [],
    shippingRate: Math.max(0, fallbackRate),
    estimatedDays: "3-5 business days",
  };
}

/** One server-authoritative quote used by checkout preview and order creation. */
export async function getShippingQuote(input: {
  city: string;
  province: string;
  subtotal: number;
}) {
  const config = await getStoreConfig();
  const zone = await getZoneForCity(
    input.city,
    input.province,
    config.standardShippingRate ?? 350,
  );
  const calculated = calculateShippingCost({
    subtotal: input.subtotal,
    baseRate: zone.shippingRate,
    enableFreeShipping: config.enableFreeShipping === true,
    freeShippingThreshold: config.freeShippingThreshold ?? 0,
  });

  return {
    id: zone.id,
    name: zone.name,
    estimatedDays: zone.estimatedDays,
    baseShippingRate: zone.shippingRate,
    ...calculated,
  };
}

export async function createShippingZone(data: {
  name: string;
  cities: string[];
  provinces: string[];
  shippingRate: number;
  estimatedDays: string;
  isActive?: boolean;
}) {
  const zone = await prisma.shippingZone.create({
    data: {
      name: data.name,
      cities: JSON.stringify(data.cities.map(normalizeShippingLocation)),
      provinces: JSON.stringify(data.provinces.map(normalizeShippingLocation)),
      shippingRate: data.shippingRate,
      estimatedDays: data.estimatedDays,
      isActive: data.isActive ?? true,
    },
  });
  return {
    ...toCandidate(zone),
    isActive: zone.isActive,
    createdAt: zone.createdAt.toISOString(),
  };
}

export async function updateShippingZone(
  id: string,
  data: {
    name?: string;
    cities?: string[];
    provinces?: string[];
    shippingRate?: number;
    estimatedDays?: string;
    isActive?: boolean;
  },
) {
  const updateData: {
    name?: string;
    cities?: string;
    provinces?: string;
    shippingRate?: number;
    estimatedDays?: string;
    isActive?: boolean;
  } = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.cities !== undefined) {
    updateData.cities = JSON.stringify(data.cities.map(normalizeShippingLocation));
  }
  if (data.provinces !== undefined) {
    updateData.provinces = JSON.stringify(data.provinces.map(normalizeShippingLocation));
  }
  if (data.shippingRate !== undefined) updateData.shippingRate = data.shippingRate;
  if (data.estimatedDays !== undefined) updateData.estimatedDays = data.estimatedDays;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const zone = await prisma.shippingZone.update({ where: { id }, data: updateData });
  return {
    ...toCandidate(zone),
    isActive: zone.isActive,
    createdAt: zone.createdAt.toISOString(),
  };
}

export async function deleteShippingZone(id: string) {
  await prisma.shippingZone.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}
