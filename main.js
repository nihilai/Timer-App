const { app, BrowserWindow, nativeImage, ipcMain, Notification, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const miniPosPath = path.join(app.getPath("userData"), "mini-window-position.json");

let mainWindow;
let miniWindow;
let miniBounds = { width: 120, height: 80 };

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  return;
}

app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");

try {
  if (fs.existsSync(miniPosPath)) {
    const { x, y } = JSON.parse(fs.readFileSync(miniPosPath, "utf8"));
    miniBounds.x = x;
    miniBounds.y = y;
  }
} catch {}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 480,
    minHeight: 480,
    backgroundColor: "#fffcf6",
    icon: nativeImage.createFromPath(path.join(__dirname, "build", "icons", "win", "icon_new.ico")),
    webPreferences: {
      partition: "persist:main",
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "timer.html"));
}

app.whenReady().then(() => {
  app.setName("My Timer");
  app.setAppUserModelId("com.nikolai.timer");

  try {
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;
    miniBounds.x = Math.max(0, Math.min(miniBounds.x ?? 0, width - 50));
    miniBounds.y = Math.max(0, Math.min(miniBounds.y ?? 0, height - 50));
  } catch {}

  createWindow();
});

ipcMain.on("toggle-mini-mode", () => {
  if (!miniWindow) {
    miniWindow = new BrowserWindow({
      ...miniBounds,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      transparent: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    const saveMiniPos = () => {
      if (!miniWindow) return;

      const [x, y] = miniWindow.getPosition();

      miniBounds.x = x;
      miniBounds.y = y;

      fs.writeFileSync(miniPosPath, JSON.stringify({ x, y }));
    };

    miniWindow.on("move", saveMiniPos);

    miniWindow.on("close", saveMiniPos);

    miniWindow.setAlwaysOnTop(true, "screen-saver");
    miniWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    miniWindow.loadFile("mini.html");
    if (mainWindow) {
      mainWindow.hide();
    }

    miniWindow.webContents.on("did-finish-load", () => {
      if (mainWindow) {
        mainWindow.webContents.send("request-current-time");
      }
    });

    miniWindow.on("closed", () => {
      miniWindow = null;
      mainWindow.show();
    });
  } else {
    miniWindow.close();
  }
});

ipcMain.on("send-current-time", (_evt, time, isRunning, isPomodoroActive) => {
  if (miniWindow) {
    miniWindow.webContents.send("time-sync", time, isRunning, isPomodoroActive);
  }
});

ipcMain.on("toggle-play-pause", () => {
  if (mainWindow) {
    mainWindow.webContents.send("toggle-play-pause");
  }
});

ipcMain.on("start-pomodoro", () => {
  if (mainWindow) {
    mainWindow.webContents.send("start-pomodoro");
  }
});

ipcMain.on("notify", (_evt, { title, body, silent }) => {
  new Notification({ title, body, silent: !!silent }).show();
});

ipcMain.on("restore-main", () => {
  if (miniWindow) {
    miniWindow.close();
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

console.log("User data folder:", app.getPath("userData"));
