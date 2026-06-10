import { prisma } from "@/lib/db";

// ── Shipping Zone helpers ──────────────────────────────────────────

export async function getShippingZones() {
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    cities: z.cities ? JSON.parse(z.cities) as string[] : [],
    provinces: z.provinces ? JSON.parse(z.provinces) as string[] : [],
    shippingRate: Number(z.shippingRate),
    estimatedDays: z.estimatedDays,
    isActive: z.isActive,
    createdAt: z.createdAt.toISOString(),
  }));
}

export async function getAllShippingZones() {
  const zones = await prisma.shippingZone.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    cities: z.cities ? JSON.parse(z.cities) as string[] : [],
    provinces: z.provinces ? JSON.parse(z.provinces) as string[] : [],
    shippingRate: Number(z.shippingRate),
    estimatedDays: z.estimatedDays,
    isActive: z.isActive,
    createdAt: z.createdAt.toISOString(),
  }));
}

export async function getZoneForCity(city: string, province: string) {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedProvince = province.trim().toLowerCase();

  // Find all active zones
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true },
  });

  // Try exact city match first
  for (const zone of zones) {
    const cities: string[] = zone.cities ? JSON.parse(zone.cities) : [];
    if (cities.includes(normalizedCity)) {
      return {
        id: zone.id,
        name: zone.name,
        shippingRate: Number(zone.shippingRate),
        estimatedDays: zone.estimatedDays,
      };
    }
  }

  // Try province match
  for (const zone of zones) {
    const provinces: string[] = zone.provinces ? JSON.parse(zone.provinces) : [];
    if (provinces.includes(normalizedProvince)) {
      return {
        id: zone.id,
        name: zone.name,
        shippingRate: Number(zone.shippingRate),
        estimatedDays: zone.estimatedDays,
      };
    }
  }

  // Fallback to default zone (Rest of Pakistan — should have empty cities/provinces arrays)
  const defaultZone = zones.find((z) => {
    const cities: string[] = z.cities ? JSON.parse(z.cities) : [];
    const provinces: string[] = z.provinces ? JSON.parse(z.provinces) : [];
    return cities.length === 0 && provinces.length === 0;
  });

  if (defaultZone) {
    return {
      id: defaultZone.id,
      name: defaultZone.name,
      shippingRate: Number(defaultZone.shippingRate),
      estimatedDays: defaultZone.estimatedDays,
    };
  }

  // Ultimate fallback if no zones exist
  return {
    id: "default",
    name: "Rest of Pakistan",
    shippingRate: 350,
    estimatedDays: "3-5 business days",
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
      cities: JSON.stringify(data.cities.map((c) => c.toLowerCase().trim())),
      provinces: JSON.stringify(data.provinces.map((p) => p.toLowerCase().trim())),
      shippingRate: data.shippingRate,
      estimatedDays: data.estimatedDays,
      isActive: data.isActive ?? true,
    },
  });
  return {
    id: zone.id,
    name: zone.name,
    cities: zone.cities ? JSON.parse(zone.cities) as string[] : [],
    provinces: zone.provinces ? JSON.parse(zone.provinces) as string[] : [],
    shippingRate: Number(zone.shippingRate),
    estimatedDays: zone.estimatedDays,
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
  }
) {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.cities !== undefined) updateData.cities = JSON.stringify(data.cities.map((c) => c.toLowerCase().trim()));
  if (data.provinces !== undefined) updateData.provinces = JSON.stringify(data.provinces.map((p) => p.toLowerCase().trim()));
  if (data.shippingRate !== undefined) updateData.shippingRate = data.shippingRate;
  if (data.estimatedDays !== undefined) updateData.estimatedDays = data.estimatedDays;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const zone = await prisma.shippingZone.update({
    where: { id },
    data: updateData,
  });

  return {
    id: zone.id,
    name: zone.name,
    cities: zone.cities ? JSON.parse(zone.cities) as string[] : [],
    provinces: zone.provinces ? JSON.parse(zone.provinces) as string[] : [],
    shippingRate: Number(zone.shippingRate),
    estimatedDays: zone.estimatedDays,
    isActive: zone.isActive,
    createdAt: zone.createdAt.toISOString(),
  };
}

export async function deleteShippingZone(id: string) {
  await prisma.shippingZone.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
