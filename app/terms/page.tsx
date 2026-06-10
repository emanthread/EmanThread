import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";

export const dynamic = "force-static";
export const revalidate = 86400;

export default function TermsPage() {
  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8">Terms of Service</h1>
          
          <div className="bg-background rounded-xl p-8 shadow-sm border border-border space-y-8">
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                This website is operated by Emaan Thread. Throughout the site, the terms “we”, “us” and “our” refer to Emaan Thread. 
                We offer this website, including all information, tools and services available from this site to you, the user, 
                conditioned upon your acceptance of all terms, conditions, policies and notices stated here.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Online Store Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence. 
                You may not use our products for any illegal or unauthorized purpose.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Accuracy of Billing and Account Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household or per order. 
                You agree to provide current, complete and accurate purchase and account information for all purchases made at our store.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Modifications to the Service and Prices</h2>
              <p className="text-muted-foreground leading-relaxed">
                Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
