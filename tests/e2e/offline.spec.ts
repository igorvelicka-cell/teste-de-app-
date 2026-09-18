import { test, expect } from "@playwright/test";
test("build web abre offline após carregar e instalar o cache", async ({
  page,
  context,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tudo sob controle." }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tudo sob controle." }),
  ).toBeVisible();
  await context.setOffline(false);
});
