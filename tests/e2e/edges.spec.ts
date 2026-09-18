import { test, expect } from "@playwright/test";
test("erros de salvamento, edição e exclusão com confirmação", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Novo imóvel", exact: true }).click();
  await page.getByLabel("Nome do imóvel").fill("Imóvel inicial");
  await page.evaluate(() => {
    (window as any).originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota cheia", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível salvar",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as any).originalSet;
  });
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("button", { name: "Imóveis", exact: true }).click();
  await page.getByRole("button", { name: "Editar Imóvel inicial" }).click();
  await page.getByLabel("Nome do imóvel").fill("Imóvel corrigido");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Imóvel corrigido", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nova conta", exact: true })
    .count()
    .then(async (n) => {
      if (!n)
        await page.getByRole("button", { name: "Contas", exact: true }).click();
    });
  await page.getByRole("button", { name: "Nova conta", exact: true }).click();
  await page.getByLabel("Nome da conta").fill("Taxa única");
  await page.getByLabel("Tipo da conta").selectOption("once");
  await page.getByLabel("Valor (R$)", { exact: true }).fill("0");
  await page
    .locator(".upload-box input")
    .setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    });
  await expect(page.getByRole("alert")).toContainText("danificada");
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("button", { name: "Editar Taxa única" }).click();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Excluir esta cobrança" }).click();
  await expect(page.locator(".bill-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Editar Taxa única" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Excluir esta cobrança" }).click();
  await expect(page.locator(".bill-row")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".bill-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Imóveis", exact: true }).click();
  await page.getByRole("button", { name: "Editar Imóvel corrigido" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Excluir imóvel e contas" }).click();
  await expect(
    page.getByRole("button", { name: "Imóvel corrigido", exact: true }),
  ).toHaveCount(0);
});
