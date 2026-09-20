# Privacy and Meta tracking setup

The application code keeps marketing consent default-off and does not load Google Analytics or Meta Pixel until a visitor selects **Allow analytics**.

Production configuration still requires account-level secrets and Meta dashboard setup:

- META_GRAPH_API_VERSION — an explicitly selected, currently supported Graph API version.
- META_CONVERSIONS_API_TOKEN — server-only token for Conversions API.
- META_TEST_EVENT_CODE — optional while validating events in Meta Test Events; remove after validation.
- META_APP_SECRET — validates Meta webhook signatures.
- META_LEAD_ACCESS_TOKEN — token allowed to retrieve Lead Ads submissions.
- META_WEBHOOK_VERIFY_TOKEN — private value configured on both Meta and the website.
- Admin Facebook Pixel ID — stored in Settings → SEO & Analytics.

Configure the Meta Lead Ads webhook URL as:

https://www.emanthread.com/api/meta/lead-webhook

Subscribe it to the Page leadgen field. Each Instant Form must include its own privacy-policy link and separate, unchecked consent questions named whatsapp_marketing_consent and phone_call_marketing_consent. The webhook never infers marketing permission from submission alone.

Verify before launch:

1. Use Meta's webhook verification and send a test lead.
2. Confirm the contact is written with source meta_lead_form.
3. Confirm unchecked consent stays false and explicit accepted consent is recorded.
4. Use Meta Test Events to compare browser and server PageView events with the same event ID.
5. Remove META_TEST_EVENT_CODE and repeat a production smoke test.
6. Re-test opt-out at /marketing-preferences and ensure suppressed contacts are excluded from every future campaign export/send job.
