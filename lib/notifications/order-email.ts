import { prisma } from "@/lib/db";
import { KIDS_SIZE_GUIDE_URL } from "@/lib/size-guide";
import { parseProductImages } from "@/lib/utils/parse-images";
import { escapeEmailHtml } from "./email-format";

export { escapeEmailHtml } from "./email-format";

const brandUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "https://emanthread.com"
).replace(/\/$/, "");

function absoluteUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed, brandUrl).toString();
  } catch {
    return null;
  }
}

function money(value: unknown): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : "0";
}

function selectedOptionLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((option) => {
    if (!option || typeof option !== "object") return [];
    const entry = option as Record<string, unknown>;
    if (typeof entry.label !== "string" || typeof entry.value !== "string") return [];
    return [`${entry.label}: ${entry.value}`];
  });
}

export type OrderConfirmationEmailSource = {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  subtotal: unknown;
  shippingCost: unknown;
  discountAmount: unknown;
  grandTotal: unknown;
  stitchingFee: unknown;
  shippingAddress: unknown;
  stitchingDeliveryDate: Date | null;
  items: Array<{
    quantity: number;
    priceAtTimeOfPurchase: unknown;
    product: {
      name: string;
      slug: string | null;
      sku: string;
      images: string;
      commerceProfile: {
        productKind: string;
        sizeGuideUrl: string | null;
      } | null;
    };
    configuration: {
      variantSku: string | null;
      variantLabel: string | null;
      variantImage: string | null;
      selectedOptions: unknown;
    } | null;
  }>;
};

/** Build the immutable, server-owned purchase details used by order emails. */
export function buildOrderConfirmationEmailData(
  order: OrderConfirmationEmailSource,
): Record<string, string> {
  const address =
    order.shippingAddress && typeof order.shippingAddress === "object"
      ? (order.shippingAddress as Record<string, unknown>)
      : {};

  const customerName = [address.firstName, address.lastName]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  const orderItemsHtml = order.items
    .map((item) => {
      const options = selectedOptionLabels(item.configuration?.selectedOptions);
      const sku = item.configuration?.variantSku || item.product.sku;
      const image = absoluteUrl(
        item.configuration?.variantImage || parseProductImages(item.product.images)[0],
      );
      const productHref = absoluteUrl(
        item.product.slug ? `/product/${item.product.slug}` : null,
      );
      const itemTotal = Number(item.priceAtTimeOfPurchase) * item.quantity;

      return `<tr>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;width:64px;vertical-align:top">
          ${image ? `<img src="${escapeEmailHtml(image)}" alt="" width="56" height="70" style="display:block;width:56px;height:70px;object-fit:cover;border-radius:4px" />` : ""}
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top">
          <div style="font-weight:600;color:#111827">${productHref ? `<a href="${escapeEmailHtml(productHref)}" style="color:#111827;text-decoration:none">${escapeEmailHtml(item.product.name)}</a>` : escapeEmailHtml(item.product.name)}</div>
          ${options.length ? `<div style="font-size:12px;color:#4b5563;margin-top:4px">${options.map(escapeEmailHtml).join(" &middot; ")}</div>` : ""}
          <div style="font-size:12px;color:#6b7280;margin-top:4px">SKU: ${escapeEmailHtml(sku)} &middot; Qty: ${item.quantity}</div>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;vertical-align:top">PKR ${money(itemTotal)}</td>
      </tr>`;
    })
    .join("");

  const discount = Number(order.discountAmount ?? 0);
  const stitchingFee = Number(order.stitchingFee ?? 0);
  const orderTotalsHtml = `
    <p><span>Subtotal</span><strong>PKR ${money(order.subtotal)}</strong></p>
    <p><span>Shipping</span><strong>${Number(order.shippingCost) === 0 ? "Free" : `PKR ${money(order.shippingCost)}`}</strong></p>
    ${discount > 0 ? `<p><span>Discount</span><strong>- PKR ${money(discount)}</strong></p>` : ""}
    ${stitchingFee > 0 ? `<p><span>Stitching</span><strong>PKR ${money(stitchingFee)}</strong></p>` : ""}
    <p style="font-size:16px;border-top:1px solid #d1d5db;padding-top:10px"><span>Total</span><strong>PKR ${money(order.grandTotal)}</strong></p>`;

  const addressParts = [
    address.address,
    [address.city, address.province].filter(Boolean).join(", "),
    address.postalCode,
    address.phone,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const paymentMethod = order.paymentMethod.replace(/_/g, " ");
  const isManualPayment = order.paymentMethod === "NAYAPAY" || order.paymentMethod === "MEEZAN_BANK";
  const paymentInstructionsHtml = isManualPayment
    ? `<div class="notice"><strong>Payment verification required</strong><br />Complete your ${escapeEmailHtml(paymentMethod)} transfer and upload the payment screenshot from your account. Your order will be processed after Admin verifies it.</div>`
    : order.paymentMethod === "COD"
      ? `<div class="notice"><strong>Cash on Delivery</strong><br />Please keep the order amount ready when your parcel arrives.</div>`
      : "";

  const guideUrls = new Set<string>();
  for (const item of order.items) {
    const profile = item.product.commerceProfile;
    const guide = profile?.sizeGuideUrl?.trim()
      ? absoluteUrl(profile.sizeGuideUrl)
      : profile?.productKind === "TEENS"
        ? absoluteUrl(KIDS_SIZE_GUIDE_URL)
        : profile?.productKind === "READY_TO_WEAR"
          ? absoluteUrl("/size-guide")
          : null;
    if (guide) guideUrls.add(guide);
  }
  const sizeGuideHtml = guideUrls.size
    ? `<p style="font-size:13px;color:#4b5563">Need to review sizing? ${[...guideUrls].map((url, index) => `<a href="${escapeEmailHtml(url)}">${guideUrls.size > 1 ? `Size guide ${index + 1}` : "Open the relevant size guide"}</a>`).join(" &middot; ")}</p>`
    : "";

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName,
    total: money(order.grandTotal),
    paymentMethod,
    orderItemsHtml,
    orderTotalsHtml,
    shippingAddressHtml: addressParts.map(escapeEmailHtml).join("<br />"),
    paymentInstructionsHtml,
    sizeGuideHtml,
    ...(order.stitchingDeliveryDate
      ? { stitchingDeliveryDate: order.stitchingDeliveryDate.toISOString() }
      : {}),
  };
}

export async function getOrderConfirmationEmailData(
  orderId: string,
): Promise<Record<string, string> | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              sku: true,
              images: true,
              commerceProfile: {
                select: { productKind: true, sizeGuideUrl: true },
              },
            },
          },
          configuration: true,
        },
      },
    },
  });

  return order ? buildOrderConfirmationEmailData(order) : null;
}
