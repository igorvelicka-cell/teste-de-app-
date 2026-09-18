export type Property = { id: string; name: string };
export type Rule = {
  id: string;
  propertyId: string;
  name: string;
  category: string;
  kind: "monthly" | "installments" | "once";
  start: string;
  day: number;
  count: number;
  amount: number | null;
  active: boolean;
};
export type Bill = {
  id: string;
  ruleId: string;
  propertyId: string;
  name: string;
  category: string;
  month: string;
  due: string;
  amount: number | null;
  paidAt: string | null;
  photo?: string;
  receipt?: string;
  installment?: number;
};
export type Data = {
  version: 1;
  properties: Property[];
  rules: Rule[];
  bills: Bill[];
  skipped: string[];
  reminders: boolean;
};
export const empty = (): Data => ({
  version: 1,
  properties: [],
  rules: [],
  bills: [],
  skipped: [],
  reminders: false,
});
export const uid = () => crypto.randomUUID();
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const addMonth = (m: string, n: number) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const dueDate = (m: string, day: number) => {
  const [y, mo] = m.split("-").map(Number);
  return `${m}-${String(Math.min(day, new Date(y, mo, 0).getDate())).padStart(2, "0")}`;
};
export function generate(data: Data, through = today().slice(0, 7)): Data {
  const d = structuredClone(data);
  const ids = new Set([...d.bills.map((b) => b.id), ...d.skipped]);
  for (const r of d.rules) {
    if (!r.active) continue;
    const end =
      r.kind === "once"
        ? r.start
        : r.kind === "installments"
          ? addMonth(r.start, r.count - 1)
          : through;
    for (let m = r.start, i = 1; m <= end; m = addMonth(m, 1), i++) {
      const id = `${r.id}:${m}`;
      if (ids.has(id)) continue;
      d.bills.push({
        id,
        ruleId: r.id,
        propertyId: r.propertyId,
        name: r.name,
        category: r.category,
        month: m,
        due: dueDate(m, r.day),
        amount: r.kind === "monthly" ? null : r.amount,
        paidAt: null,
        ...(r.kind === "installments" ? { installment: i } : {}),
      });
      ids.add(id);
    }
  }
  return d;
}
export const status = (b: Bill) =>
  b.paidAt ? "Paga" : b.due < today() ? "Atrasada" : "Pendente";
export const money = (n: number) =>
  (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dateBR = (s: string) => s.split("-").reverse().join("/");
export const monthLabel = (m: string) =>
  new Date(`${m}-02T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
export const total = (b: Bill[]) => b.reduce((s, x) => s + (x.amount ?? 0), 0);
export function demo(): Data {
  const d = empty();
  const m = today().slice(0, 7);
  d.properties = [
    { id: "casa", name: "Casa Jardim" },
    { id: "apto", name: "Apartamento Centro" },
    { id: "praia", name: "Casa de Praia" },
  ];
  const specs: [string, string, string, number, number, boolean][] = [
    ["casa", "Energia elétrica", "Luz", 18640, 10, true],
    ["casa", "Água e esgoto", "Água", 9235, 22, false],
    ["casa", "Internet fibra", "Internet", 11990, 25, false],
    ["apto", "Condomínio", "Condomínio", 48000, 8, true],
    ["apto", "IPTU", "IPTU", 14570, 12, false],
    ["praia", "Energia elétrica", "Luz", null as unknown as number, 28, false],
  ];
  specs.forEach(([p, n, c, a, day, paid], i) => {
    const id = `demo${i}`;
    d.rules.push({
      id,
      propertyId: p,
      name: n,
      category: c,
      kind: "monthly",
      start: addMonth(m, -2),
      day,
      count: 1,
      amount: null,
      active: true,
    });
  });
  const out = generate(d);
  out.bills.forEach((b) => {
    const i = Number(b.ruleId.replace("demo", ""));
    b.amount = specs[i][3];
    if (b.month < m || specs[i][5]) b.paidAt = b.due;
  });
  return out;
}
