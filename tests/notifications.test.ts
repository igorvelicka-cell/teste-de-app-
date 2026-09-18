import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const api = vi.hoisted(() => ({
  getPending: vi.fn(),
  cancel: vi.fn(),
  checkPermissions: vi.fn(),
  schedule: vi.fn(),
}));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: api }));
vi.mock("../src/storage", () => ({ native: true }));
import { syncNotifications } from "../src/notifications";
import { empty, generate, type Data } from "../src/domain";
let data: Data;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 17, 10));
  vi.clearAllMocks();
  api.getPending.mockResolvedValue({ notifications: [{ id: 99 }] });
  api.checkPermissions.mockResolvedValue({ display: "granted" });
  api.cancel.mockResolvedValue(undefined);
  api.schedule.mockResolvedValue(undefined);
  data = generate({
    ...empty(),
    reminders: true,
    properties: [{ id: "p", name: "Casa" }],
    rules: [
      {
        id: "r",
        propertyId: "p",
        name: "Luz",
        category: "Luz",
        start: "2026-09",
        day: 22,
        count: 1,
        kind: "once",
        amount: 100,
        active: true,
      },
    ],
  });
});
afterEach(() => vi.useRealTimers());
describe("cálculo de lembretes (API Android substituída no teste)", () => {
  it("agenda dois dias antes às 9h locais", async () => {
    await syncNotifications(data);
    const n = api.schedule.mock.calls[0][0].notifications[0];
    expect(n.schedule.at).toEqual(new Date(2026, 8, 20, 9));
    expect(api.cancel).toHaveBeenCalledWith({ notifications: [{ id: 99 }] });
  });
  it("cancela lembretes de contas pagas ou excluídas", async () => {
    data.bills[0].paidAt = "2026-09-17";
    await syncNotifications(data);
    expect(api.schedule).not.toHaveBeenCalled();
    data.bills = [];
    data.skipped = ["r:2026-09"];
    await syncNotifications(data);
    expect(api.schedule).not.toHaveBeenCalled();
  });
  it("não agenda no passado e usa vencimento corrigido", async () => {
    data.bills[0].due = "2026-09-19";
    await syncNotifications(data);
    expect(api.schedule).not.toHaveBeenCalled();
    data.bills[0].due = "2026-09-25";
    await syncNotifications(data);
    expect(api.schedule.mock.calls[0][0].notifications[0].schedule.at).toEqual(
      new Date(2026, 8, 23, 9),
    );
  });
  it("não agenda sem permissão ou quando desativado", async () => {
    data.reminders = false;
    await syncNotifications(data);
    expect(api.schedule).not.toHaveBeenCalled();
    data.reminders = true;
    api.checkPermissions.mockResolvedValue({ display: "denied" });
    await expect(syncNotifications(data)).rejects.toThrow("permissão");
  });
});
