// "Private access" intro (docs/DESIGN.md §7, test list in §9).
// Runs on every device project in playwright.config.ts (intro-*), Chromium
// and WebKit. The signup request is mocked with page.route, so these tests
// never create subscribers or touch Resend.
import { test, expect, type Page } from "@playwright/test";
import path from "path";

const dialog = (page: Page) => page.getByRole("dialog", { name: /Made by hand/ });

async function openHome(page: Page) {
  await page.goto("/");
  await expect(dialog(page)).toBeVisible();
}

test.describe("Private access intro", () => {
  test("shows on the first visit to /, with focus inside", async ({ page }, info) => {
    await openHome(page);
    const focusInside = await page.evaluate(() => !!document.querySelector(".cozi-intro")?.contains(document.activeElement));
    expect(focusInside).toBe(true);
    // The store still renders underneath and in the HTML.
    await expect(page.locator("main")).toBeAttached();
    await page.screenshot({ path: path.join("test-results", "intro-screens", `${info.project.name}.png`) });
  });

  test("'Enter the shop' closes it and a reload doesn't show it again", async ({ page }) => {
    await openHome(page);
    await page.getByRole("button", { name: /^Enter the shop/ }).last().click();
    await expect(dialog(page)).toBeHidden();
    await page.reload();
    await expect(page.locator(".cozi-intro")).toBeHidden();
  });

  test("Esc closes it and focus goes back to the page", async ({ page }) => {
    await openHome(page);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    const focusInside = await page.evaluate(() => !!document.querySelector(".cozi-intro")?.contains(document.activeElement));
    expect(focusInside).toBe(false);
  });

  test("never shows on a product page or a /#section deep link", async ({ page }) => {
    await page.goto("/products");
    await expect(page.locator(".cozi-intro")).toHaveCount(0);
    await page.goto("/#newsletter");
    await expect(page.locator(".cozi-intro")).toBeHidden();
  });

  test("an invalid email shows an inline error and stores nothing", async ({ page }) => {
    let called = false;
    await page.route("**/api/subscribe", (route) => { called = true; return route.fulfill({ json: { ok: true } }); });
    await openHome(page);
    const field = page.getByPlaceholder("Your email");
    await field.fill("aoife@");
    await page.getByRole("button", { name: /join private access/i }).click();
    await expect(page.locator(".cozi-intro [role=alert]")).toBeVisible();
    await expect(field).toHaveValue("aoife@");
    expect(called).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem("cozi_intro_v1"))).toBeNull();
  });

  test("a valid signup shows the success state", async ({ page }) => {
    await page.route("**/api/subscribe", (route) => route.fulfill({ json: { ok: true } }));
    await openHome(page);
    await page.getByPlaceholder("Your email").fill("Aoife@Example.com");
    await page.getByRole("button", { name: /join private access/i }).click();
    await expect(page.getByRole("heading", { name: /Check your inbox/ })).toBeVisible();
    await expect(page.locator(".cozi-intro")).toContainText("aoife@example.com");
  });

  test("colour mode renders the media block at its reserved size", async ({ page }) => {
    // Image mode, the broken-URL fallback and "phones only download the
    // mobile crop" depend on config/intro.ts; they were verified by switching
    // the config by hand (phase 7) and are covered by the build-time alt guard.
    await openHome(page);
    const media = page.locator(".cozi-intro__media");
    const box = await media.boundingBox();
    if ((page.viewportSize()?.height ?? 900) >= 500) {
      expect(box?.height ?? 0).toBeGreaterThan(150);
    } else {
      await expect(media).toBeHidden(); // short landscape screens hide it
    }
  });
});
