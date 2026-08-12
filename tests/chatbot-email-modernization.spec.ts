import { expect, test } from "@playwright/test";

import { extractSearchIntent } from "../lib/chat-db-search";
import {
  messageNeedsCatalogContext,
  messageNeedsSizeGuideContext,
  publishedCatalogHierarchy,
} from "../lib/chat-store-context";
import { CHAT_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT_URDU } from "../lib/chat-system-prompt";
import {
  buildOrderConfirmationEmailData,
  escapeEmailHtml,
  type OrderConfirmationEmailSource,
} from "../lib/notifications/order-email";
import { EmailTemplates } from "../lib/notifications/templates";
import { emailHtmlToText } from "../lib/notifications/providers/resend";

test("chatbot recognizes the expanded catalog, product kinds, and size-guide questions", () => {
  expect(extractSearchIntent("Show me teen girls ready to wear").type).toBe("product");
  expect(extractSearchIntent("Do you have beauty shades?").type).toBe("product");
  expect(extractSearchIntent("Which perfume volume is available?").type).toBe("product");
  expect(messageNeedsCatalogContext("What categories are available for women?")).toBe(true);
  expect(messageNeedsSizeGuideContext("Please share the kids size chart")).toBe(true);
  expect(CHAT_SYSTEM_PROMPT).toContain("Color + Size combinations");
  expect(CHAT_SYSTEM_PROMPT).toContain("multi-department");
  expect(CHAT_SYSTEM_PROMPT_URDU).toContain("Color + Size combinations");
});

test("chat catalog excludes a child when its published ancestor is absent", () => {
  const visible = publishedCatalogHierarchy([
    { id: "women", parentId: null, label: "Women", path: "/women", nodeType: "DEPARTMENT", productKind: null, displayOrder: 1 },
    { id: "rtw", parentId: "women", label: "Ready to Wear", path: "/women/ready-to-wear", nodeType: "CATEGORY", productKind: "READY_TO_WEAR", displayOrder: 1 },
    { id: "orphan", parentId: "hidden-parent", label: "Hidden Child", path: "/women/hidden/child", nodeType: "SUBCATEGORY", productKind: "READY_TO_WEAR", displayOrder: 2 },
  ]);

  expect(visible.map((node) => node.path)).toEqual(["/women", "/women/ready-to-wear"]);
  expect(visible[1].breadcrumb).toBe("Women > Ready to Wear");
});

test("order email renders canonical option/SKU details and safely escapes customer data", () => {
  const order: OrderConfirmationEmailSource = {
    id: "order-1",
    orderNumber: "ET-2026-123456",
    paymentMethod: "MEEZAN_BANK",
    subtotal: 4500,
    shippingCost: 250,
    discountAmount: 100,
    stitchingFee: 0,
    grandTotal: 4650,
    stitchingDeliveryDate: null,
    shippingAddress: {
      firstName: "Ayesha <script>alert(1)</script>",
      lastName: "Khan",
      address: "Street 1",
      city: "Islamabad",
      province: "ICT",
      phone: "03001234567",
    },
    items: [{
      quantity: 2,
      priceAtTimeOfPurchase: 2250,
      product: {
        name: "Teen Kurta",
        slug: "teen-kurta",
        sku: "LEGACY-SKU",
        images: JSON.stringify(["/products/kurta.jpg"]),
        commerceProfile: { productKind: "TEENS", sizeGuideUrl: null },
      },
      configuration: {
        variantSku: "TK-NAVY-M",
        variantLabel: "Navy / M",
        variantImage: "/products/kurta-navy.jpg",
        selectedOptions: [
          { label: "Color", value: "Navy" },
          { label: "Size", value: "M" },
        ],
      },
    }],
  };

  const data = buildOrderConfirmationEmailData(order);
  const html = EmailTemplates.order_confirmation.body(data);

  expect(html).toContain("TK-NAVY-M");
  expect(html).toContain("Color: Navy");
  expect(html).toContain("Size: M");
  expect(html).toContain("Payment verification required");
  expect(html).toContain("kids-size-guide.pdf");
  expect(html).not.toContain("<script>alert(1)</script>");
  expect(html).toContain(escapeEmailHtml("Ayesha <script>alert(1)</script>"));
  expect(emailHtmlToText(html)).toContain("TK-NAVY-M");
});

