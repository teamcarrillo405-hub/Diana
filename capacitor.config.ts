import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Diana native shells (Capacitor).
 *
 * Diana is a server-rendered Next.js app, so the native apps load the hosted
 * production app inside the shell (server.url mode) and add native
 * capabilities on top: haptics now; APNs push, share sheet, and the
 * home-screen widget in later passes. native-shell/ holds only the offline
 * fallback page.
 *
 * Before store submission:
 *  - appId is permanent once published — confirm it (reverse-DNS you own).
 *  - server.url must point at the public production domain, and Vercel
 *    Deployment Protection must be OFF or the shell shows a login wall.
 */
const config: CapacitorConfig = {
  appId: "com.teamcarrillo.diana",
  appName: "Diana",
  webDir: "native-shell",
  server: {
    url: "https://diana-teamcarrillo405-hubs-projects.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
