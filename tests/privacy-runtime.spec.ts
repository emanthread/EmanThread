import { expect, test } from "@playwright/test";

test("privacy, tracking consent, opt-out, and AI disclosure work in the browser", async ({ page }) => {
  const thirdPartyRequests: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  await page.addInitScript(() => {
    localStorage.removeItem("emanthread_tracking_consent_v1");
  });

  await page.route("https://connect.facebook.net/**", async (route) => {
    thirdPartyRequests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
  });
  await page.route("https://www.googletagmanager.com/**", async (route) => {
    thirdPartyRequests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${message.text()} @ ${JSON.stringify(message.location())}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText}`));

  await page.goto("/privacy-policy", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Privacy choices" })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Emaan Thread");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("emanthread_tracking_consent_v1")))
    .toBeNull();

  await page.getByRole("link", { name: "Marketing Opt-out" }).click();
  await page.waitForURL("**/marketing-preferences");
  await expect(page.getByRole("heading", { name: "Marketing preferences" })).toBeVisible();
  await expect(page.getByLabel("Mobile / WhatsApp number")).toBeVisible();
  await expect(page.getByText("Stop marketing messages on WhatsApp")).toBeVisible();
  await expect(page.getByText("Stop marketing phone calls")).toBeVisible();

  await page.keyboard.press("Tab");
  const supportButton = page.getByRole("button", { name: "Support options" });
  await expect(supportButton).toBeVisible({ timeout: 15000 });
  await supportButton.click();
  const aiChatButton = page.getByRole("button", { name: /AI Chat/ }).first();
  await expect(aiChatButton).toBeVisible();
  await aiChatButton.click();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByText(/Messages are processed by our AI provider/)).toBeVisible();

  const webhookResponse = await page.request.get(
    "/api/meta/lead-webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test",
  );
  expect(webhookResponse.status()).toBe(403);

  expect(failedRequests.filter((message) => !message.includes("ERR_ABORTED"))).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((message) => !message.includes("favicon"))).toEqual([]);
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
});
