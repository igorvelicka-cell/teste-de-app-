import { test, expect } from "@playwright/test";
const photo = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
test("cadastro, fotos, pagamento, histórico, recorrência, backup e demonstração isolada", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Novo imóvel", exact: true }).click();
  await page.getByLabel("Nome do imóvel").fill("Casa Teste");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Casa Teste", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova conta", exact: true }).click();
  await page.getByLabel("Nome da conta").fill("Energia teste");
  await page.getByLabel("Valor (R$)", { exact: true }).fill("123,45");
  await page
    .locator(".upload-box input")
    .setInputFiles({ name: "conta.png", mimeType: "image/png", buffer: photo });
  await expect(page.getByAltText("Foto da conta")).toBeVisible();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".bill-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Pagar", exact: true }).click();
  await page
    .locator(".upload-box input")
    .setInputFiles({
      name: "comprovante.png",
      mimeType: "image/png",
      buffer: photo,
    });
  await page.getByRole("button", { name: "Confirmar pagamento" }).click();
  await expect(page.locator(".status.paga")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".status.paga")).toHaveCount(1);
  await page.getByRole("button", { name: "Editar Energia teste" }).click();
  await expect(page.getByAltText("Foto da conta")).toBeVisible();
  await expect(page.getByAltText("Foto do comprovante")).toBeVisible();
  await page.getByLabel("Nome da conta").fill("Energia corrigida");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("contas-em-dia-v1")!).bills.length,
  );
  await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.getByRole("button", { name: "Mês anterior" }).click();
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("contas-em-dia-v1")!).bills.length,
    ),
  ).toBe(before);
  await page.getByRole("button", { name: "Nova conta", exact: true }).click();
  await page.getByLabel("Nome da conta").fill("IPTU parcelado");
  await page.getByLabel("Tipo da conta").selectOption("installments");
  await page.getByLabel("Quantidade de parcelas").fill("3");
  await page.getByLabel("Valor da parcela").fill("80");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("contas-em-dia-v1")!).bills.filter(
          (b: any) => b.name === "IPTU parcelado",
        ).length,
    ),
  ).toBe(3);
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(page.getByText("Total efetivamente pago")).toBeVisible();
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar backup", exact: true })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page
    .locator(".file-label input")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.getByRole("alert")).toContainText("inválido");
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  page.once("dialog", (d) => d.accept());
  await page.locator(".file-label input").setInputFiles(path!);
  await expect(page.getByRole("alert")).toContainText("restaurado");
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await page.getByRole("button", { name: "Entrar na demonstração" }).click();
  await expect(
    page.getByText("Modo demonstração", { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: "screenshots/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "screenshots/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Sair da demonstração" }).click();
  await expect(
    page.getByRole("button", { name: "Casa Teste", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Casa Jardim", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: /Energia corrigida/ })
    .first()
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Desfazer pagamento" }).click();
  await expect(page.locator(".status.paga")).toHaveCount(0);
  expect(errors).toEqual([]);
});
