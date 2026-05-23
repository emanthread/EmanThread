import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";

export default function SupportPage() {
  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8">Support Center</h1>
          <div className="bg-background rounded-xl p-8 shadow-sm border border-border">
            <p className="text-muted-foreground leading-relaxed mb-6">
              Welcome to the Emaan Thread Support Center. How can we assist you today?
              Browse our FAQs, check shipping and return policies, or contact us directly.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <a href="/contact" className="block p-6 border border-border rounded-lg hover:border-primary transition-colors">
                <h3 className="font-semibold text-lg mb-2">Contact Us</h3>
                <p className="text-sm text-muted-foreground">Get in touch with our customer service team.</p>
              </a>
              <a href="/faqs" className="block p-6 border border-border rounded-lg hover:border-primary transition-colors">
                <h3 className="font-semibold text-lg mb-2">FAQs</h3>
                <p className="text-sm text-muted-foreground">Find answers to commonly asked questions.</p>
              </a>
              <a href="/shipping" className="block p-6 border border-border rounded-lg hover:border-primary transition-colors">
                <h3 className="font-semibold text-lg mb-2">Shipping Information</h3>
                <p className="text-sm text-muted-foreground">Learn about our delivery times and rates.</p>
              </a>
              <a href="/returns" className="block p-6 border border-border rounded-lg hover:border-primary transition-colors">
                <h3 className="font-semibold text-lg mb-2">Returns & Exchanges</h3>
                <p className="text-sm text-muted-foreground">Read about our hassle-free return policy.</p>
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
