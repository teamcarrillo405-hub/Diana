const { app, BrowserWindow, session, shell } = require("electron");
const path = require("node:path");

const DEFAULT_APP_URL = "http://localhost:3000";
const appUrl = process.env.DIANA_ELECTRON_URL || DEFAULT_APP_URL;

let mainWindow = null;

function isAllowedDianaUrl(url, { allowData = false } = {}) {
  try {
    const parsed = new URL(url);
    return parsed.origin === new URL(appUrl).origin || (allowData && parsed.protocol === "data:");
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 390,
    minHeight: 700,
    title: "Diana",
    backgroundColor: "#122019",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedDianaUrl(url)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAllowedDianaUrl(url, { allowData: true })) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame || !mainWindow) return;
    mainWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(renderLaunchError(errorCode, errorDescription, validatedUrl))}`,
    );
  });

  void mainWindow.loadURL(appUrl);
}

function configureMediaPermissions() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    if (permission !== "media") {
      callback(false);
      return;
    }

    const requestingUrl = details.requestingUrl || webContents.getURL();
    const mediaTypes = details.mediaTypes || (details.mediaType ? [details.mediaType] : []);
    const audioRequested = mediaTypes.length === 0 || mediaTypes.includes("audio");
    callback(Boolean(audioRequested && isAllowedDianaUrl(requestingUrl)));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details = {}) => {
    if (permission !== "media") return false;
    const mediaTypes = details.mediaTypes || (details.mediaType ? [details.mediaType] : []);
    const audioRequested = mediaTypes.length === 0 || mediaTypes.includes("audio");
    return Boolean(audioRequested && isAllowedDianaUrl(requestingOrigin || webContents.getURL()));
  });
}

function renderLaunchError(errorCode, errorDescription, _validatedUrl) {
  const safeUrl = escapeHtml(appUrl);
  const safeDescription = escapeHtml(errorDescription || "The local Diana web app did not respond.");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Diana desktop</title>
    <style>
      * { box-sizing: border-box; }
      summary { min-height:44px;padding-block:12px;cursor:pointer; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #122019;
        color: #fff8e8;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(560px, calc(100vw - 32px));
        border: 1px solid #aca78e88;
        border-radius: 2px;
        background: #181f1b;
        padding: 24px;
        box-shadow: 0 18px 48px rgb(15 23 42 / 0.1);
      }
      .eyebrow {
        color: #f4d69b;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      a { display:inline-block;min-height:44px;box-sizing:border-box;padding:12px 20px;background:#355745;color:#fff8e8;text-decoration:none;border:1px solid #aca78e; } a:focus-visible { outline:3px solid #f4d69b;outline-offset:4px; } .wordmark { color:#fff8e8;font:italic 800 44px/1 Georgia,serif;margin:0 0 24px; } h1 { margin: 8px 0 10px; font-size: 26px; line-height: 1.15; }
      p { line-height: 1.6; color: #c8d2c9; }
    </style>
  </head>
  <body>
    <main>
      <p class="wordmark">DIANA</p><p class="eyebrow">Desktop connection</p>
      <h1>Let’s reconnect.</h1>
      <p>Diana could not open your workspace. Check your connection, then try again. Your saved work stays on this device.</p>
      <p><a href="${safeUrl}">Try again</a></p>
      <details><summary>Connection details</summary><p>${safeDescription} (${errorCode})</p></details>
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.whenReady().then(() => {
  configureMediaPermissions();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
