import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { getContentPage } from "@/lib/content-pages";

export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const content = await getContentPage("story_content");

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8">Our Story</h1>
          
          {content ? (
            <div
              className="bg-background rounded-xl p-8 shadow-sm border border-border prose prose-muted max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="space-y-16 relative border-l border-border pl-8 sm:pl-12 ml-4 sm:ml-auto">
              <div className="relative">
                <span className="absolute -left-10 sm:-left-14 top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background"></span>
                <h2 className="text-2xl font-semibold mb-4 text-primary">The Beginning</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Eman Thread started with a simple observation: men's unstitched fabric in the market was either 
                  prohibitively expensive or severely compromised in quality. We set out to bridge this gap, 
                  sourcing directly from the finest mills to bring luxury textiles to the modern gentleman.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-10 sm:-left-14 top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background"></span>
                <h2 className="text-2xl font-semibold mb-4 text-primary">Mastering the Craft</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Years were spent understanding the weave, the thread count, and the dyeing processes. 
                  Our founders traveled extensively to curate a selection of Wash & Wear and Cotton blends 
                  that perform exceptionally well in local climates while maintaining a crisp, regal drape.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-10 sm:-left-14 top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background"></span>
                <h2 className="text-2xl font-semibold mb-4 text-primary">Eman Thread Today</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Today, Eman Thread stands as a symbol of trust and refined taste. We continue to innovate 
                  with seasonal collections while keeping our core philosophy intact: "The Style Never Dies."
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}