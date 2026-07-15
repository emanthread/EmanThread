import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
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
          
          {content ? (
            <div
              className="bg-background rounded-xl p-8 shadow-sm border border-border prose prose-muted max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="bg-background rounded-xl p-8 shadow-sm border border-border space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">Delivery Times & Rates</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We strive to deliver your premium fabrics as quickly and safely as possible.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Standard Shipping:</strong> 3-5 business days across Pakistan. PKR 200 per order.</li>
                  <li><strong>Free Shipping:</strong> Available on all orders exceeding PKR 5,000.</li>
                  <li><strong>Express Shipping:</strong> 1-2 business days in major cities. PKR 500 per order.</li>
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