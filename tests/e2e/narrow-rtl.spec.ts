import { test, expect, type Page } from "@playwright/test";

/**
 * PLAN.md §19.18 opens with "no horizontal scrolling on any screen" and
 * requires every control to be at least 44x44px, both at 320px in Hebrew RTL.
 * Neither was checked by anything until now — CI ran one spec, on the 390px
 * LTR project. These assertions make those two rules self-enforcing.
 *
 * Only routes reachable without a session are covered here; the authenticated
 * shell needs seeded CI credentials (see tests/e2e/add-spot.spec.ts).
 */
const PUBLIC_ROUTES = ["/he", "/he/signin", "/he/signup", "/he/privacy", "/he/terms"];

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflowing: string[] = [];
    if (doc.scrollWidth > doc.clientWidth) {
      // Name the widest offenders so a failure is actionable, not just "true".
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 1 || r.left < -1) {
          overflowing.push(
            `${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 60)} ` +
              `(${Math.round(r.left)}..${Math.round(r.right)})`
          );
        }
        if (overflowing.length >= 5) break;
      }
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, overflowing };
  });
}

test.describe("narrow-screen RTL", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} does not scroll horizontally`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const result = await horizontalOverflow(page);
      expect(
        result.scrollWidth,
        `Horizontal overflow on ${route}. Widest offenders: ${result.overflowing.join(" | ")}`
      ).toBeLessThanOrEqual(result.clientWidth);
    });
  }

  test("/he/signin controls meet the 44px touch target floor", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "en-ltr", "Touch-target rule is checked on the phone projects");

    await page.goto("/he/signin");
    await page.waitForLoadState("networkidle");

    const undersized = await page.evaluate(() => {
      const MIN = 44;
      const out: string[] = [];
      const controls = document.querySelectorAll<HTMLElement>(
        "button, a[href], input:not([type=hidden]), select, [role=button]"
      );
      for (const el of Array.from(controls)) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);

        // Not rendered, or visually hidden (sr-only skip links clip to 1x1
        // and only become a real target on focus).
        if (r.width <= 1 || r.height <= 1) continue;

        // WCAG 2.5.8 exempts links in a block of text. A bare <a> with no
        // background and no border is prose, not a control; anything styled
        // as a button (which gives it a background or border) stays checked.
        const isTextLink =
          el.tagName === "A" &&
          cs.borderTopWidth === "0px" &&
          /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
        if (isTextLink) continue;

        if (r.height < MIN || r.width < MIN) {
          out.push(
            `${el.tagName.toLowerCase()}[${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 24) ?? ""}] ` +
              `${Math.round(r.width)}x${Math.round(r.height)}`
          );
        }
      }
      return out;
    });

    expect(undersized, `Controls below 44px: ${undersized.join(" | ")}`).toEqual([]);
  });

  test("html is RTL and lang=he on Hebrew routes", async ({ page }) => {
    await page.goto("/he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
  });
});
