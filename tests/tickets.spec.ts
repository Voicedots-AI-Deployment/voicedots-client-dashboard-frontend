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
