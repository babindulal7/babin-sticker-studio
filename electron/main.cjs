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

// Atomic file write to protect against power loss or crashes during save
async function saveStore(nextStore) {
  const storePath = await getStorePath();
  const tmpPath = `${storePath}.tmp-${Date.now()}`;
  storeCache = nextStore;
  await fs.writeFile(tmpPath, JSON.stringify(storeCache, null, 2), "utf8");
  await fs.rename(tmpPath, storePath);
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

  // Strict allowlist for internal local print windows (about:blank or "")
  // External URLs are opened safely in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url === "about:blank" || url === "") {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 1100,
          height: 850,
          autoHideMenuBar: true,
          backgroundColor: "#FFFFFF",
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        },
      };
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
}

// Storage IPC
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

// Native Desktop Printing IPC Handler
ipcMain.handle("print:html", async (_event, { html, title = "Print Stickers", silent = false }) => {
  let printWin = null;
  try {
    printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    const encoded = Buffer.from(html, "utf8").toString("base64");
    await printWin.loadURL(`data:text/html;charset=utf-8;base64,${encoded}`);

    return new Promise((resolve) => {
      printWin.webContents.print(
        {
          silent: Boolean(silent),
          printBackground: true,
          color: true,
        },
        (success, failureReason) => {
          if (printWin && !printWin.isDestroyed()) {
            printWin.close();
          }
          if (!success && failureReason !== "cancelled") {
            resolve({ ok: false, error: failureReason || "Print failed" });
          } else {
            resolve({ ok: true, cancelled: failureReason === "cancelled" });
          }
        }
      );
    });
  } catch (err) {
    if (printWin && !printWin.isDestroyed()) {
      printWin.close();
    }
    return { ok: false, error: err.message || "Desktop print error" };
  }
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
