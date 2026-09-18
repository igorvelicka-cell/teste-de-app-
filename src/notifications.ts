import { LocalNotifications } from "@capacitor/local-notifications";
import { native } from "./storage";
import { generate, addMonth, today, type Data } from "./domain";
export async function enableNotifications() {
  if (!native) return false;
  const p = await LocalNotifications.requestPermissions();
  if (p.display !== "granted")
    throw new Error("Permissão de notificações não concedida.");
  const exact = await LocalNotifications.checkExactNotificationSetting();
  if (exact.exact_alarm !== "granted")
    await LocalNotifications.changeExactNotificationSetting();
  return true;
}
export async function syncNotifications(data: Data) {
  if (!native) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length)
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  if (!data.reminders) return;
  if ((await LocalNotifications.checkPermissions()).display !== "granted")
    throw new Error(
      "Lembretes sem permissão. Ative as notificações em Ajustes.",
    );
  const projected = generate(data, addMonth(today().slice(0, 7), 12));
  const notifications = projected.bills
    .filter((b) => !b.paidAt)
    .map((b, i) => {
      const at = new Date(`${b.due}T09:00:00`);
      at.setDate(at.getDate() - 2);
      return {
        id: i + 1,
        title: `${b.name} vence em dois dias`,
        body: `${data.properties.find((p) => p.id === b.propertyId)?.name} • Confira sua conta no Contas em Dia.`,
        schedule: { at, allowWhileIdle: true },
        extra: { billId: b.id },
      };
    })
    .filter((n) => n.schedule.at.getTime() > Date.now());
  if (notifications.length)
    await LocalNotifications.schedule({ notifications });
}
