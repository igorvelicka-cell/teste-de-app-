import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "br.com.contasemdia.app",
  appName: "Contas em Dia",
  webDir: "dist",
  plugins: {
    LocalNotifications: { smallIcon: "ic_stat_bill", iconColor: "#B7F397" },
  },
};
export default config;
