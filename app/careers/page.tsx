import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Button } from "@/components/ui/button";

export default function CareersPage() {
  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="text-4xl font-serif font-bold mb-4">Join Our Team</h1>
            <p className="text-muted-foreground text-lg">
              We are always looking for passionate, driven individuals who share our love for luxury textiles and exceptional customer service.
            </p>
          </div>
          
          <div className="bg-background rounded-xl p-8 shadow-sm border border-border">
            <h2 className="text-2xl font-semibold mb-6">Open Positions</h2>
            
            <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground mb-4">There are currently no open positions available.</p>
              <p className="text-sm text-muted-foreground mb-6">
                However, we are always eager to meet talented people. Send us your resume!
              </p>
              <Button asChild>
                <a href="mailto:careers@emaanthread.com">Email Resume</a>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
