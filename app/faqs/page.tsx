import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQsPage() {
  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8 text-center">Frequently Asked Questions</h1>
          
          <div className="bg-background rounded-xl p-8 shadow-sm border border-border">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left font-medium">What is your shipping policy?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  We offer free standard shipping on all orders over PKR 5,000 within Pakistan. 
                  Standard shipping takes 3-5 business days. Express shipping options are available at checkout.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left font-medium">Do you offer international shipping?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Currently, we ship within Pakistan. We are working on expanding our delivery network 
                  to international destinations soon.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left font-medium">What is your return policy?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  We accept returns within 7 days of delivery, provided the fabric is unwashed, uncut, 
                  and in its original packaging. Please contact our support team to initiate a return.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left font-medium">How much fabric do I need for a standard men's suit?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  A standard men's Shalwar Kameez typically requires 4 to 4.5 meters of fabric. 
                  If you are exceptionally tall or require a special cut, we recommend 5 meters.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left font-medium">Are the colors on the website accurate?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  We make every effort to display the colors of our products as accurately as possible. 
                  However, due to differences in monitor displays and lighting during photography, 
                  the actual color may slightly vary.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
