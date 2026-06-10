import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { getContentPage } from "@/lib/content-pages";

// Must remain force-dynamic: getContentPage() reads prisma.storeConfig which requires
// a live database connection — this cannot be statically rendered at build time.
export const dynamic = "force-dynamic";

export default async function SizeGuidePage() {
  const content = await getContentPage("size_guide_content");

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8">Size Guide</h1>
          
          {content ? (
            <div
              className="bg-background rounded-xl p-8 shadow-sm border border-border prose prose-muted max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="bg-background rounded-xl p-8 shadow-sm border border-border space-y-8">
              <section>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Emaan Thread provides premium unstitched fabrics. While you will have the suit tailored to your exact measurements, 
                  understanding how much fabric you need is crucial before making a purchase. Below is a general guide for standard men's attire.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-6">Standard Fabric Requirements</h2>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="font-semibold text-left p-3">Height / Build</th>
                        <th className="font-semibold text-left p-3">Garment Type</th>
                        <th className="font-semibold text-right p-3">Required Fabric</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="p-3">Up to 5'10" (Average Build)</td>
                        <td className="p-3">Shalwar Kameez</td>
                        <td className="p-3 text-right">4.0 Meters</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="p-3">5'11" to 6'2" (Average Build)</td>
                        <td className="p-3">Shalwar Kameez</td>
                        <td className="p-3 text-right">4.5 Meters</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="p-3">Above 6'2" or Broad Build</td>
                        <td className="p-3">Shalwar Kameez</td>
                        <td className="p-3 text-right">5.0 to 5.5 Meters</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="p-3">Any Height</td>
                        <td className="p-3">Kurta Only</td>
                        <td className="p-3 text-right">2.0 to 2.5 Meters</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="p-3">Any Height</td>
                        <td className="p-3">Waistcoat / Nehru Jacket</td>
                        <td className="p-3 text-right">1.5 Meters</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
              
              <section className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-lg border border-emerald-100 dark:border-emerald-900">
                <h3 className="font-semibold text-lg text-emerald-800 dark:text-emerald-400 mb-2">Pro Tip from Our Master Tailors</h3>
                <p className="text-emerald-700 dark:text-emerald-300 text-sm leading-relaxed">
                  If you prefer a looser fit, distinct pleats in your shalwar, or wish to add styling details like cuffs, 
                  plackets, and elaborate collars, it's always safer to order an extra half meter (0.5m) of fabric. 
                  Most of our standard cuts come in 4.5 meters which is generous enough for most designs.
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