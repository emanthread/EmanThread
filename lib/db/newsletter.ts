import { prisma } from "@/lib/db";

export async function subscribeToNewsletter(email: string, source?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email: normalizedEmail },
    update: {
      isSubscribed: true,
      unsubscribedAt: null,
    },
    create: {
      email: normalizedEmail,
      source: source || "footer",
      isSubscribed: true,
    },
  });
  return {
    id: subscriber.id,
    email: subscriber.email,
    isSubscribed: subscriber.isSubscribed,
    subscribedAt: subscriber.subscribedAt.toISOString(),
    source: subscriber.source,
  };
}

export async function unsubscribeFromNewsletter(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const subscriber = await prisma.newsletterSubscriber.update({
      where: { email: normalizedEmail },
      data: {
        isSubscribed: false,
        unsubscribedAt: new Date(),
      },
    });
    return {
      id: subscriber.id,
      email: subscriber.email,
      isSubscribed: subscriber.isSubscribed,
      unsubscribedAt: subscriber.unsubscribedAt?.toISOString(),
    };
  } catch (err) {
    return null;
  }
}

export async function getNewsletterSubscribers(options: {
  page?: number;
  limit?: number;
  filter?: "all" | "subscribed";
}) {
  const { page = 1, limit = 20, filter = "all" } = options;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (filter === "subscribed") {
    where.isSubscribed = true;
  }
  const [subscribers, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.newsletterSubscriber.count({ where }),
  ]);
  return {
    subscribers: subscribers.map((s) => ({
      id: s.id,
      email: s.email,
      isSubscribed: s.isSubscribed,
      subscribedAt: s.subscribedAt.toISOString(),
      unsubscribedAt: s.unsubscribedAt?.toISOString() || null,
      source: s.source,
    })),
    total,
    page,
    limit,
  };
}
