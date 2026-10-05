import { expect, test } from "@playwright/test"

test.describe("Admin control panel", () => {
  test("Overview page renders stats and sections", async ({ page }) => {
    await page.goto("/admin")
    await expect(
      page.getByRole("heading", { name: "Control Panel" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Latest inquiries" }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Manage" })).toBeVisible()
  })

  test("Sidebar links to every admin section", async ({ page }) => {
    await page.goto("/admin")
    for (const label of [
      "Inquiries",
      "Inventory",
      "Site & Branding",
      "Users",
    ]) {
      await expect(
        page.locator('[data-sidebar="menu-button"]', { hasText: label }),
      ).toBeVisible()
    }
  })

  test("Inventory page renders the vehicle inventory", async ({ page }) => {
    await page.goto("/admin/inventory")
    await expect(
      page.getByRole("heading", { name: "Inventory", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Vehicle Inventory" }),
    ).toBeVisible()
  })

  test("Inquiries page renders search and status filters", async ({ page }) => {
    await page.goto("/admin/inquiries")
    await expect(page.getByRole("heading", { name: "Inquiries" })).toBeVisible()
    await expect(
      page.getByPlaceholder("Search name, email or message"),
    ).toBeVisible()
    await expect(page.getByText("All inquiries")).toBeVisible()
  })

  test("Site page renders the branding form", async ({ page }) => {
    await page.goto("/admin/site")
    await expect(
      page.getByRole("heading", { name: "Site & Branding" }),
    ).toBeVisible()
    await expect(page.getByText("Dealership name")).toBeVisible()
    await expect(page.getByText("Hero headline")).toBeVisible()
  })

  test("Deleting an inquiry asks for confirmation first", async ({ page }) => {
    await page.goto("/admin/inquiries")

    const deleteButton = page.getByRole("button", { name: "Delete inquiry" })
    await expect(deleteButton).toBeHidden()

    // Seed a lead through the public API, then reload the admin table.
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    // The test creates its own vehicle so it never depends on seeded data.
    const car = await page.request.post("/api/v1/cars/", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: "Confirmation Fixture",
        make: "Aurelia",
        model: "Confirmer",
        year: 2024,
        description: "Temporary vehicle created to host a test lead.",
        price: 50000,
        mileage: 1000,
        transmission: "automatic",
        fuel_type: "petrol",
        condition: "new",
        location: "Casablanca",
        image_urls: [],
        display_order: 0,
      },
    })
    expect(
      car.ok(),
      `seed vehicle failed: ${car.status()} ${JSON.stringify(await car.text())}`,
    ).toBe(true)
    const carId = (await car.json()).id as string

    const created = await page.request.post(
      `/api/v1/cars/${carId}/inquiries/`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: "Confirmation Tester",
          email: "confirm@example.com",
          message: "Please delete me only after confirming.",
        },
      },
    )
    expect(
      created.ok(),
      `seed inquiry failed: ${created.status()} ${JSON.stringify(
        await created.text(),
      )}`,
    ).toBe(true)

    await page.reload()
    // Earlier runs may have left a lead with the same name, so target the newest.
    const row = page
      .getByRole("row")
      .filter({ hasText: "Confirmation Tester" })
      .last()
    await expect(row).toBeVisible()

    // A single click must not delete anything on its own.
    await row.getByRole("button", { name: "Delete inquiry" }).click()
    await expect(
      page.getByRole("heading", { name: "Delete this inquiry?" }),
    ).toBeVisible()
    await expect(
      page.getByText(/permanently removed, along with any concierge notes/),
    ).toBeVisible()

    // Cancelling keeps the lead.
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(row).toBeVisible()

    // Confirming removes it.
    await row.getByRole("button", { name: "Delete inquiry" }).click()
    await page.getByRole("button", { name: "Delete inquiry" }).last().click()
    await expect(row).toBeHidden()

    // Clean up the fixture vehicle.
    await page.request.delete(`/api/v1/cars/${carId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  })
})
