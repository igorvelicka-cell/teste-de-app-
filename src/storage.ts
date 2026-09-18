import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { empty, type Data } from "./domain";
export const native = Capacitor.isNativePlatform();
const key = "contas-em-dia-v1";
const img = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const validDate = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  v >= "2000-01-01" &&
  v <= "2100-12-31" &&
  new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v;
const str = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 200;
const amount = (v: unknown) =>
  v === null ||
  (Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 99999999999);
export function validate(input: unknown): Data {
  const d = input as Data;
  const fail = () => {
    throw new Error(
      "Backup inválido ou incompatível. Os dados atuais foram preservados.",
    );
  };
  if (
    !d ||
    d.version !== 1 ||
    !Array.isArray(d.properties) ||
    !Array.isArray(d.rules) ||
    !Array.isArray(d.bills) ||
    !Array.isArray(d.skipped) ||
    typeof d.reminders !== "boolean"
  )
    return fail();
  if (
    d.bills.length > 50000 ||
    d.rules.length > 10000 ||
    d.properties.length > 1000
  )
    return fail();
  const unique = (a: { id: string }[]) =>
    new Set(a.map((x) => x.id)).size === a.length;
  if (!unique(d.properties) || !unique(d.rules) || !unique(d.bills))
    return fail();
  for (const p of d.properties) if (!str(p.id) || !str(p.name)) return fail();
  for (const r of d.rules)
    if (
      !str(r.id) ||
      !str(r.name) ||
      !str(r.category) ||
      !d.properties.some((p) => p.id === r.propertyId) ||
      !["monthly", "installments", "once"].includes(r.kind) ||
      !validDate(r.start + "-01") ||
      !Number.isInteger(r.day) ||
      r.day < 1 ||
      r.day > 31 ||
      !Number.isInteger(r.count) ||
      r.count < 1 ||
      r.count > 600 ||
      !amount(r.amount) ||
      typeof r.active !== "boolean"
    )
      return fail();
  for (const b of d.bills) {
    const r = d.rules.find((r) => r.id === b.ruleId);
    if (
      !str(b.id) ||
      !str(b.name) ||
      !str(b.category) ||
      !r ||
      r.propertyId !== b.propertyId ||
      !validDate(b.month + "-01") ||
      b.id !== `${b.ruleId}:${b.month}` ||
      !validDate(b.due) ||
      !amount(b.amount) ||
      (b.paidAt !== null && (!validDate(b.paidAt) || b.amount === null)) ||
      [b.photo, b.receipt].some(
        (x) =>
          x !== undefined &&
          (typeof x !== "string" || x.length > 8000000 || !img.test(x)),
      )
    )
      return fail();
  }
  if (
    d.skipped.some((x) => !str(x)) ||
    new Set(d.skipped).size !== d.skipped.length
  )
    return fail();
  for (const b of d.bills) {
    if (
      b.installment !== undefined &&
      (!Number.isInteger(b.installment) ||
        b.installment < 1 ||
        b.installment > 600)
    )
      return fail();
  }
  return structuredClone(d);
}
// Version dispatch is the migration boundary. Future formats must migrate explicitly.
export function migrate(raw: unknown): Data {
  return validate(raw);
}
export async function load(): Promise<Data> {
  if (!native) {
    const raw = localStorage.getItem(key);
    return raw ? migrate(JSON.parse(raw)) : empty();
  }
  let raw: string;
  try {
    raw = (
      await Filesystem.readFile({
        path: "data.json",
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      })
    ).data as string;
  } catch (e) {
    const files = await Filesystem.readdir({
      path: "",
      directory: Directory.Data,
    });
    if (files.files.some((f) => f.name === "data.json")) throw e;
    return empty();
  }
  const data = JSON.parse(raw) as Data;
  for (const b of data.bills)
    for (const k of ["photo", "receipt"] as const)
      if (b[k]) {
        const ref = JSON.parse(b[k]!);
        if (!/^images\/[a-f0-9-]+\.(jpeg|png|webp)$/.test(ref.path))
          throw new Error("Referência de imagem inválida.");
        const f = await Filesystem.readFile({
          path: ref.path,
          directory: Directory.Data,
        });
        b[k] = `data:image/${ref.type};base64,${f.data}`;
      }
  return migrate(data);
}
export async function save(data: Data): Promise<void> {
  validate(data);
  if (!native) {
    localStorage.setItem(key, JSON.stringify(data));
    return;
  }
  const copy = structuredClone(data);
  for (const b of copy.bills)
    for (const k of ["photo", "receipt"] as const)
      if (b[k]) {
        const [, type, base64] = b[k]!.match(
          /^data:image\/(jpeg|png|webp);base64,(.+)$/,
        )!;
        const path = `images/${crypto.randomUUID()}.${type}`;
        await Filesystem.writeFile({
          path,
          data: base64,
          directory: Directory.Data,
          recursive: true,
        });
        b[k] = JSON.stringify({ path, type });
      }
  await Filesystem.writeFile({
    path: "data.next.json",
    data: JSON.stringify(copy),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
  await Filesystem.rename({
    from: "data.next.json",
    to: "data.json",
    directory: Directory.Data,
    toDirectory: Directory.Data,
  });
  // Cleanup happens only after the new metadata is committed.
  try {
    const used = new Set(
      copy.bills
        .flatMap((b) => [b.photo, b.receipt])
        .filter(Boolean)
        .map((x) => JSON.parse(x!).path),
    );
    const files = await Filesystem.readdir({
      path: "images",
      directory: Directory.Data,
    });
    for (const f of files.files)
      if (!used.has(`images/${f.name}`))
        await Filesystem.deleteFile({
          path: `images/${f.name}`,
          directory: Directory.Data,
        });
  } catch {
    /* Old unreferenced images are harmless if cleanup fails. */
  }
}
export async function readImage(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Escolha uma foto JPG, PNG ou WebP de até 5 MB.");
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Não foi possível ler a foto."));
    r.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("A imagem está danificada."));
    image.src = data;
  });
  return data;
}
export async function exportBackup(data: Data) {
  const body = JSON.stringify(validate(data));
  const name = `contas-em-dia-${new Date().toISOString().slice(0, 10)}.json`;
  if (native) {
    const f = await Filesystem.writeFile({
      path: name,
      data: body,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: "Backup Contas em Dia", url: f.uri });
  } else {
    const url = URL.createObjectURL(
      new Blob([body], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
