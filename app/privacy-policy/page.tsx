import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-32 pb-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold mb-8">Privacy Policy</h1>
          
          <div className="bg-background rounded-xl p-8 shadow-sm border border-border space-y-8">
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you visit Emaan Thread, we collect certain information about your device, your interaction with our site, and information necessary to process your purchases. We may also collect additional information if you contact us for customer support.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use your personal information to provide our services to you, which includes: offering products for sale, processing payments, shipping and fulfillment of your order, and keeping you up to date on new products, services, and offers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you place an order through the Site, we will retain your Personal Information for our records unless and until you ask us to erase this information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We take reasonable precautions and follow industry best practices to make sure your personal information is not inappropriately lost, misused, accessed, disclosed, altered or destroyed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. WhatsApp Communications</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  With your explicit consent, we may send you order-related updates via WhatsApp, including order confirmations, shipping notifications, and delivery status updates.
                </p>
                <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">5.1 Consent</h3>
                <p>
                  You can opt in to receive WhatsApp notifications during checkout or in your account settings. This consent is entirely voluntary, and you may withdraw it at any time by updating your preferences in your account settings.
                </p>
                <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">5.2 Data Usage</h3>
                <p>
                  When you opt in to WhatsApp notifications, we store your WhatsApp-enabled phone number (which may be the same as your profile phone number or a separate number you provide). This data is used solely for sending order-related messages and is never shared with third parties for marketing purposes.
                </p>
                <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">5.3 Opting Out</h3>
                <p>
                  You can opt out of WhatsApp notifications at any time by visiting your Account Settings page and toggling off WhatsApp notifications. You may also reply STOP to any WhatsApp message to unsubscribe.
                </p>
                <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">5.4 Message Content</h3>
                <p>
                  All WhatsApp messages are sent using pre-approved templates via the WhatsApp Business API. Messages include only order-related information and do not contain promotional content unless you have separately opted in to marketing communications.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to access, correct, update, or delete your personal information. You can manage most of this through your account settings. For other requests, please contact us at privacy@emaanthreads.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
