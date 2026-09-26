import { expect, test } from "@playwright/test";

test("disabled support tickets page does not request the unavailable ticket API", async ({ page }) => {
    let ticketRequests = 0;
    await page.addInitScript(() => localStorage.setItem("access_token", "test-session"));
    await page.route(/\/v[13]\//, async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith("/v1/ticket/")) ticketRequests += 1;
        if (url.pathname === "/v1/users/me") {
            return route.fulfill({
                json: { user_id: "client-1", name: "Test Client", email: "test@example.com" },
            });
        }
        return route.fulfill({ json: {} });
    });

    await page.goto("/dashboard/tickets", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Support Tickets" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Support ticketing is not enabled yet");
    await expect(page.getByText("No tickets found")).toHaveCount(0);
    expect(ticketRequests).toBe(0);
});

test("dashboard charts start without invalid-size warnings", async ({ page }) => {
    const chartWarnings: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "warning" && message.text().includes("width(") && message.text().includes("height(")) {
            chartWarnings.push(message.text());
        }
    });
    await page.addInitScript(() => localStorage.setItem("access_token", "test-session"));
    await page.route(/\/v[13]\//, async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/v1/users/me") {
            return route.fulfill({
                json: { user_id: "client-1", name: "Test Client", email: "test@example.com", agent_id: "agent_test" },
            });
        }
        if (url.pathname === "/v1/kpis/") return route.fulfill({ json: { timeseries: [] } });
        return route.fulfill({ json: {} });
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /overview|dashboard/i }).first()).toBeVisible();
    await expect.poll(() => chartWarnings).toEqual([]);
});

test("expanded client sidebar is wider on desktop without breaking compact or mobile layouts", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("access_token", "client-session"));
    await page.route(/\/v[13]\//, async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/v1/users/me") {
            return route.fulfill({ json: { user_id: "client-1", name: "College Manager", email: "manager@example.edu" } });
        }
        return route.fulfill({ json: {} });
    });

    const sidebar = page.locator("aside").first();
    for (const width of [1440, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/dashboard/tickets");
        await expect(page.getByRole("heading", { name: "Support Tickets" })).toBeVisible();
        const layout = await page.evaluate(() => ({
            sidebar: document.querySelector("aside")!.getBoundingClientRect().width,
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
        }));
        expect(layout.sidebar).toBe(272);
        expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/tickets");
    await page.locator("header button").first().click();
    await expect(sidebar).toHaveClass(/translate-x-0/);
    await expect.poll(() => sidebar.evaluate(el => el.getBoundingClientRect().left)).toBe(0);
    const mobile = await page.evaluate(() => ({
        sidebar: document.querySelector("aside")!.getBoundingClientRect(),
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
    }));
    expect(mobile.sidebar.left).toBe(0);
    expect(mobile.sidebar.width).toBe(288);
    expect(mobile.pageWidth).toBeLessThanOrEqual(mobile.viewportWidth);
});
