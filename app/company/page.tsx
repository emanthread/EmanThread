import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function CompanyPage() {
  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8">Company</h1>
          
          <div className="bg-background rounded-xl p-8 shadow-sm border border-border">
            <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
              Emaan Thread is a premier purveyor of luxury unstitched fabrics for men. 
              Learn more about our heritage, our mission, and our team.
            </p>
            
            <div className="space-y-4">
              <Link href="/about" className="flex items-center justify-between p-6 border border-border rounded-lg hover:border-primary transition-all group">
                <div>
                  <h3 className="text-xl font-semibold mb-1">About Us</h3>
                  <p className="text-muted-foreground">Discover what makes Emaan Thread unique and our commitment to quality.</p>
                </div>
                <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link href="/story" className="flex items-center justify-between p-6 border border-border rounded-lg hover:border-primary transition-all group">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Our Story</h3>
                  <p className="text-muted-foreground">The journey of Emaan Thread from a small concept to a luxury fabric brand.</p>
                </div>
                <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link href="/careers" className="flex items-center justify-between p-6 border border-border rounded-lg hover:border-primary transition-all group">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Careers</h3>
                  <p className="text-muted-foreground">Join our team of passionate individuals dedicated to the art of textiles.</p>
                </div>
                <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link href="/press" className="flex items-center justify-between p-6 border border-border rounded-lg hover:border-primary transition-all group">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Press</h3>
                  <p className="text-muted-foreground">Media resources, latest news, and PR contact information.</p>
                </div>
                <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
