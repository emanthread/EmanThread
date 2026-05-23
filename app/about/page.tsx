import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { getContentPage } from "@/lib/content-pages";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const content = await getContentPage("about_content");

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8 text-center">About Eman Thread</h1>
          
          {content ? (
            <div
              className="bg-background rounded-xl p-8 shadow-sm border border-border prose prose-muted max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="bg-background rounded-xl overflow-hidden shadow-sm border border-border">
              <div className="relative h-[300px] sm:h-[400px] w-full">
                <Image
                  src="/images/fabrics/hero_banner_1_1776582592087.png"
                  alt="Eman Thread premium fabrics"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
              </div>
              
              <div className="p-8 sm:p-12">
                <div className="max-w-3xl mx-auto space-y-8">
                  <section>
                    <h2 className="text-3xl font-serif font-semibold mb-4">Our Mission</h2>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      At Eman Thread, we believe that true elegance begins with the foundation—the fabric. 
                      Our mission is to provide the modern gentleman with the finest quality unstitched fabrics, 
                      sourcing premium materials that reflect sophistication, durability, and timeless style.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-3xl font-serif font-semibold mb-4">Uncompromising Quality</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      We specialize in premium Wash & Wear, Egyptian Cottons, pure Boski, and luxurious Wool Blends. 
                      Every yard of fabric in our collection undergoes rigorous quality control to ensure flawless texture, 
                      color fastness, and drape. When you choose Eman Thread, you are choosing a garment that will stand 
                      the test of time.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-3xl font-serif font-semibold mb-4">The Promise</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      We are deeply committed to elevating the standard of men's Eastern wear. Our promise is 
                      simple: to deliver not just fabric, but the canvas for your personal expression of style and grace.
                    </p>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}