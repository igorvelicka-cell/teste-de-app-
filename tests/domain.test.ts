import { describe, it, expect, vi, afterEach } from "vitest";
import { empty, generate, dueDate, type Rule } from "../src/domain";
import { validate } from "../src/storage";
const setup = (kind: Rule["kind"] = "monthly") => ({
  ...empty(),
  properties: [{ id: "p", name: "Casa" }],
  rules: [
    {
      id: "r",
      propertyId: "p",
      name: "Luz",
      category: "Luz",
      kind,
      start: "2024-01",
      day: 31,
      count: 3,
      amount: 15000,
      active: true,
    },
  ],
});
afterEach(() => vi.useRealTimers());
describe("recorrência e histórico", () => {
  it("preenche meses ausentes sem duplicação e sem valor", () => {
    const d = generate(setup(), "2024-04");
    expect(d.bills).toHaveLength(4);
    expect(
      d.bills.every((b) => b.amount === null && !b.photo && !b.paidAt),
    ).toBe(true);
    expect(generate(d, "2024-04")).toEqual(d);
    expect(generate(d, "2024-06").bills).toHaveLength(6);
  });
  it("respeita ano bissexto e último dia", () => {
    expect(dueDate("2024-02", 31)).toBe("2024-02-29");
    expect(dueDate("2025-02", 31)).toBe("2025-02-28");
    expect(dueDate("2025-04", 31)).toBe("2025-04-30");
  });
  it("preserva cobrança alterada, pagamento e fotos", () => {
    let d = generate(setup(), "2024-01");
    d.bills[0] = {
      ...d.bills[0],
      amount: 12000,
      due: "2024-02-02",
      paidAt: "2024-02-03",
      photo: "foto",
      receipt: "comprovante",
    };
    expect(generate(d, "2024-05").bills[0]).toEqual(d.bills[0]);
  });
  it("parcelas respeitam o limite e valor; única não repete", () => {
    const d = generate(setup("installments"), "2027-12");
    expect(d.bills).toHaveLength(3);
    expect(d.bills.map((b) => b.installment)).toEqual([1, 2, 3]);
    expect(d.bills.every((b) => b.amount === 15000)).toBe(true);
    expect(generate(setup("once"), "2027-12").bills).toHaveLength(1);
  });
  it("não recria exclusões nem recorrências encerradas", () => {
    const d = generate(setup(), "2024-01");
    d.skipped.push(d.bills[0].id);
    d.bills = [];
    expect(generate(d, "2024-01").bills).toHaveLength(0);
    d.rules[0].active = false;
    expect(generate(d, "2026-12").bills).toHaveLength(0);
  });
});
describe("backup", () => {
  it("valida ida e volta com imagem e comprovante separados", () => {
    const d = generate(setup(), "2024-01");
    d.bills[0].photo = "data:image/png;base64,aGVsbG8=";
    d.bills[0].receipt = "data:image/jpeg;base64,d29ybGQ=";
    expect(validate(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
  it("rejeita versões futuras, referências inválidas, duplicatas e datas impossíveis", () => {
    const d = generate(setup(), "2024-01");
    expect(() => validate({ ...d, version: 2 })).toThrow();
    expect(() => validate({ ...d, properties: [] })).toThrow();
    expect(() => validate({ ...d, bills: [...d.bills, ...d.bills] })).toThrow();
    d.bills[0].due = "2024-02-31";
    expect(() => validate(d)).toThrow();
  });
  it("distingue valor zero de valor ausente", () => {
    const d = generate(setup(), "2024-01");
    expect(validate(d).bills[0].amount).toBeNull();
    d.bills[0].amount = 0;
    expect(validate(d).bills[0].amount).toBe(0);
  });
});
