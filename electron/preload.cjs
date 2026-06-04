const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("dianaDesktop", {
  mode: "desktop",
  platform: process.platform,
});
