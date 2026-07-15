import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { getContentPage } from "@/lib/content-pages";

export const revalidate = 3600;

export default async function ReturnsPage() {
  const content = await getContentPage("returns_content");

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8">Returns & Exchanges</h1>
          
          {content ? (
            <div
              className="bg-background rounded-xl p-8 shadow-sm border border-border prose prose-muted max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="bg-background rounded-xl p-8 shadow-sm border border-border space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">Our Return Policy</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We want you to be completely satisfied with your purchase from Emaan Thread. 
                  If you are not entirely happy with your fabric, we offer a straightforward 7-day return and exchange policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Conditions for Returns</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Items must be returned within 7 days of the delivery date.</li>
                  <li>The fabric must be uncut, unwashed, and in its original, pristine condition.</li>
                  <li>All original tags, packaging, and labels must be intact.</li>
                  <li>Proof of purchase (order number or receipt) is required.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">How to Initiate a Return</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Contact our support team at <a href="mailto:support@emaanthread.com" className="text-primary underline">support@emaanthread.com</a> or via WhatsApp.</li>
                  <li>Provide your order number and the reason for the return.</li>
                  <li>Our team will arrange for a courier to pick up the package from your address.</li>
                  <li>Once we receive and inspect the returned item, we will process your refund or exchange.</li>
                </ol>
              </section>
              
              <section>
                <h2 className="text-2xl font-semibold mb-4">Refunds</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Refunds are processed within 3-5 business days after the returned item passes our quality inspection. 
                  The refunded amount will be transferred to your original method of payment or provided as store credit, 
                  as per your preference. Please note that shipping charges are non-refundable.
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