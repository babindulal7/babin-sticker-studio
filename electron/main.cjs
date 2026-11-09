const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const APP_STORE_FILE = "app-storage.json";
let storeCache = null;

async function getStorePath() {
  const userData = app.getPath("userData");
  await fs.mkdir(userData, { recursive: true });
  return path.join(userData, APP_STORE_FILE);
}

async function loadStore() {
  if (storeCache) return storeCache;
  try {
    const storePath = await getStorePath();
    const raw = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    storeCache = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    storeCache = {};
  }
  return storeCache;
}

async function saveStore(nextStore) {
  const storePath = await getStorePath();
  storeCache = nextStore;
  await fs.writeFile(storePath, JSON.stringify(storeCache), "utf8");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 720,
    autoHideMenuBar: true,
    backgroundColor: "#0F0F0F",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.ELECTRON_START_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

ipcMain.handle("storage:get", async (_event, key) => {
  const store = await loadStore();
  const value = store[String(key)];
  return value == null ? null : { value };
});

ipcMain.handle("storage:set", async (_event, key, value) => {
  const store = await loadStore();
  const next = { ...store, [String(key)]: value };
  await saveStore(next);
  return { ok: true };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
