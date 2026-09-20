import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/lazy-cart-drawer";
import { getStoreConfig } from "@/lib/db-queries";

export const metadata: Metadata = {
  title: "Privacy Policy | Eman Thread",
  description:
    "How Eman Thread collects, uses, protects, and shares customer information.",
};

export default async function PrivacyPolicyPage() {
  const config = await getStoreConfig();
  const privacyEmail = config.email || "contact@emanthreads.com";

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen bg-muted/30 pb-16 pt-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-3 text-4xl font-serif font-bold">Privacy Policy</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Last updated: September 20, 2026
          </p>

          <div className="space-y-8 rounded-xl border border-border bg-background p-6 shadow-sm sm:p-8">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">1. Who we are</h2>
              <p className="leading-relaxed text-muted-foreground">
                This Privacy Policy explains how Eman Thread collects, uses, stores,
                and protects personal information when you use our website, place an
                order, contact us, use our AI chat, or submit information through
                Facebook, Instagram, or a Meta Lead Form.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">2. Information we collect</h2>
              <p className="leading-relaxed text-muted-foreground">
                Depending on how you interact with us, we may collect:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Name, email address, mobile or WhatsApp number, and account details.</li>
                <li>Delivery address, city, province, order, payment-status, return, and measurement information needed to provide requested services.</li>
                <li>Your interest or category, such as Men, Women, or Teens, and product preferences you choose to provide.</li>
                <li>Customer-support requests, AI chat questions, and other information you send to us.</li>
                <li>Device, browser, page-view, referral, cookie, and advertising-event information when optional analytics or advertising tracking is enabled with your permission.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">3. Facebook, Instagram, and Meta Lead Forms</h2>
              <p className="leading-relaxed text-muted-foreground">
                If you respond to an Eman Thread advertisement or Lead Form on Facebook
                or Instagram, Meta may provide us with the information you submit, such
                as your name, mobile or WhatsApp number, email, city, and selected
                interest or category. We use this information to respond to your
                request, help you find relevant products or services, and, only where
                the form records the appropriate consent, send collection updates,
                launches, offers, promotions, or other Eman Thread marketing.
              </p>
              <p className="leading-relaxed text-muted-foreground">
                Submitting a lead form does not by itself provide marketing permission.
                WhatsApp marketing and marketing phone calls require the applicable
                consent choice presented on the form. Meta also processes information
                under its own privacy terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">4. How we use information</h2>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Create and manage accounts, orders, payments, deliveries, returns, and stitching or measurement services.</li>
                <li>Answer questions, provide support, prevent fraud or abuse, and maintain website security.</li>
                <li>Communicate about products, collections, launches, and offers when the customer has provided the required marketing consent.</li>
                <li>Measure website and advertising performance through consented analytics, Meta Pixel, and, where configured, Meta Conversions API.</li>
                <li>Meet legal, accounting, operational, and dispute-resolution requirements.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">5. Transactional and marketing communications</h2>
              <h3 className="text-lg font-semibold">Transactional communications</h3>
              <p className="leading-relaxed text-muted-foreground">
                Order confirmations, payment notices, delivery updates, return updates,
                and service messages relate to a transaction you requested. We may send
                them by email, SMS, WhatsApp, or phone as necessary and as supported by
                the preferences or permission collected for that order.
              </p>
              <h3 className="text-lg font-semibold">WhatsApp marketing</h3>
              <p className="leading-relaxed text-muted-foreground">
                If you separately opt in, Eman Thread may send WhatsApp messages about
                new collections, product launches, offers, promotions, and other
                marketing updates. This permission is optional and is separate from
                transactional order updates.
              </p>
              <h3 className="text-lg font-semibold">Marketing phone calls</h3>
              <p className="leading-relaxed text-muted-foreground">
                Where you have provided phone-call permission, an authorized Eman Thread
                representative may call about relevant products, services, orders, or
                marketing communications within the scope of your consent.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">6. Withdraw consent and opt out</h2>
              <p className="leading-relaxed text-muted-foreground">
                You can stop marketing WhatsApp messages or marketing phone calls at any
                time through our{" "}
                <Link
                  href="/marketing-preferences"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Marketing Preferences
                </Link>{" "}
                page. Account holders can also switch off either marketing channel in
                Account Settings. You may also tell an authorized representative that
                you no longer wish to receive marketing calls. An opt-out does not stop
                essential communications about an active order or requested service.
              </p>
            </section>

            <section id="ai-chat" className="scroll-mt-32 space-y-3">
              <h2 className="text-2xl font-semibold">7. AI assistant and website chat</h2>
              <p className="leading-relaxed text-muted-foreground">
                The AI chat processes the questions, preferences, names, phone or
                WhatsApp numbers, and other information you choose to type. Messages are
                sent to our AI service provider, DeepSeek, to generate a reply. For a
                signed-in customer, the website may use relevant Eman Thread catalog or
                order context to answer the request.
              </p>
              <p className="leading-relaxed text-muted-foreground">
                The current website does not write chat transcripts to the Eman Thread
                customer database; the visible conversation is held in the current
                browser session while the chat is open. The AI provider processes the
                request on our behalf and may retain service records under its terms and
                our provider settings. Do not submit passwords, full payment-card
                numbers, government identification, or other information that is not
                needed for your question. Authorized Eman Thread personnel may access
                information when required for support, security, or investigation.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">8. Cookies, Meta Pixel, and Conversions API</h2>
              <p className="leading-relaxed text-muted-foreground">
                Necessary browser storage supports security and core website functions.
                Optional analytics and advertising technologies load only after you
                select “Allow analytics.” When enabled, Google Analytics and Meta Pixel
                may receive page, device, browser, referral, cookie, and interaction
                data. Where Meta Conversions API is configured, a corresponding
                server-side event may be sent to Meta using the same event identifier
                to support measurement and avoid duplicate counting.
              </p>
              <p className="leading-relaxed text-muted-foreground">
                You can reopen “Privacy Choices” in the website footer and change your
                selection. We also honor a supported browser Global Privacy Control
                signal by defaulting optional tracking to denied.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">9. Access, sharing, and no sale of contact information</h2>
              <p className="leading-relaxed text-muted-foreground">
                Customer information is available only to authorized Eman Thread team
                members who need it for legitimate business duties. We may use carefully
                selected service providers for hosting, payments, delivery,
                communications, analytics, advertising measurement, and AI processing.
                They receive only the information needed to perform their service and
                are expected to protect it.
              </p>
              <p className="font-medium leading-relaxed">
                Eman Thread does not sell or commercially trade customer contact
                information to third parties.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">10. Security</h2>
              <p className="leading-relaxed text-muted-foreground">
                We use reasonable technical and organizational safeguards, including
                HTTPS in transit, authenticated and role-restricted administrative
                access, server-side validation, rate limiting, signed webhook
                verification, and restricted handling of service credentials. No
                internet service is completely risk-free, so we also limit collection
                to information needed for the stated purposes and review access when
                operationally necessary.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">11. Retention</h2>
              <p className="leading-relaxed text-muted-foreground">
                We retain information only for as long as needed to provide services,
                maintain required business and transaction records, resolve disputes,
                enforce agreements, prevent abuse, and meet legal obligations. Retention
                varies by record type. We delete or de-identify information when it is
                no longer reasonably required, subject to legal and backup limitations.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">12. Your choices and contact</h2>
              <p className="leading-relaxed text-muted-foreground">
                You may request access, correction, or deletion of eligible personal
                information, or ask a privacy question, by emailing{" "}
                <a
                  href={"mailto:" + privacyEmail}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  {privacyEmail}
                </a>
                . We may need to verify your identity before completing a request.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
