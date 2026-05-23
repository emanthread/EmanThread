import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ContactPage() {
  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8 text-center">Contact Us</h1>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-background rounded-xl p-8 shadow-sm border border-border">
              <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>
              <form className="space-y-6">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Order Inquiry" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="How can we help you?" className="mt-2" rows={5} />
                </div>
                <Button type="button" className="w-full">Send Message</Button>
              </form>
            </div>

            <div className="space-y-8">
              <div className="bg-background rounded-xl p-8 shadow-sm border border-border">
                <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg">Email</h3>
                    <p className="text-muted-foreground mt-1">support@emaanthread.com</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Phone</h3>
                    <p className="text-muted-foreground mt-1">+92 300 1234567</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Operating Hours</h3>
                    <p className="text-muted-foreground mt-1">Monday - Saturday: 9:00 AM - 6:00 PM (PKT)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
