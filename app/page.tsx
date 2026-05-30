import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { FlashSaleBanner } from "@/app/components/flash-sale-banner";
import { HeroSection } from "@/components/home/hero-section";
import { LuxuryHighlightsSection } from "@/components/home/luxury-highlights-section";
import { CategoriesSection } from "@/components/home/categories-section";
import { TrendingSection } from "@/components/home/trending-section";
import { NewArrivalsSection } from "@/components/home/new-arrivals-section";
import { PromoSection } from "@/components/home/promo-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";

import { getAllProducts, getFeaturedCategories } from "@/lib/db-queries";

export default async function HomePage() {
  const products = await getAllProducts();
  const featuredCategories = await getFeaturedCategories();

  return (
    <>
      <Header />
      <CartDrawer />
      <FlashSaleBanner />
      <main>
        <HeroSection />
        <LuxuryHighlightsSection />
        <CategoriesSection categories={featuredCategories} />
        <TrendingSection products={products} />
        <PromoSection />
        <NewArrivalsSection products={products} />
        <TestimonialsSection />
      </main>
      <Footer />
    </>
  );
}
