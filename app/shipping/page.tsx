import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/lazy-cart-drawer";
import { STORE_POLICIES, refreshPolicyContent } from "@/lib/store-policies";
import { getContentPage } from "@/lib/content-pages";

export const revalidate = 3600;

export default async function ShippingPage() {
  const content = await getContentPage("shipping_content");

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8">Shipping Information</h1>
          
          <div className="mb-6 rounded-xl border border-border bg-background p-6">
            <p className="font-medium">Shipping info: {STORE_POLICIES.delivery} after order confirmation.</p>
            <p className="mt-2 text-muted-foreground">Delivery charges are calculated at checkout.</p>
          </div>
          {content ? (
            <div
              className="bg-background rounded-xl p-8 shadow-sm border border-border prose prose-muted max-w-none"
              dangerouslySetInnerHTML={{ __html: refreshPolicyContent(content, "shipping") }}
            />
          ) : (
            <div className="bg-background rounded-xl p-8 shadow-sm border border-border space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">Delivery Times & Rates</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We strive to deliver your premium fabrics as quickly and safely as possible.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Delivery rates:</strong> Calculated at checkout from your city, province, and the latest Admin Panel settings.</li>
                  <li><strong>Delivery estimate:</strong> {STORE_POLICIES.delivery} after order confirmation.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Order Processing</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Orders placed before 2:00 PM (PKT) Monday through Friday are processed and dispatched on the same day. 
                  Orders placed after 2:00 PM, on weekends, or during public holidays will be processed the next business day.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Order Tracking</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Once your order has been dispatched, you will receive an email and a WhatsApp notification containing your 
                  tracking number. You can use this number on our courier partner's website to track your delivery status.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
