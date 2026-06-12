import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ryuuto1r.tsunagarumori",
  appName: "つながる森",
  webDir: "dist",
  bundledWebRuntime: false,
  ios: {
    contentInset: "automatic",
  },
};

export default config;
