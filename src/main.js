const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let mainWindow;
let tray;
let isQuitting = false;
const windowSize = { width: 230, height: 210 };
const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function readWindowState() {
  try {
    const saved = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      return constrainPosition(saved.x, saved.y, windowSize.width, windowSize.height);
    }
  } catch (_) {
    // First launch or an unreadable state file: use a friendly default position.
  }
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  return {
    x: Math.round(area.x + area.width - windowSize.width - 36),
    y: Math.round(area.y + area.height - windowSize.height - 24)
  };
}

function constrainPosition(x, y, width, height) {
  const display = screen.getDisplayNearestPoint({ x, y });
  const area = display.workArea;
  return {
    x: Math.round(Math.max(area.x, Math.min(x, area.x + area.width - width))),
    y: Math.round(Math.max(area.y, Math.min(y, area.y + area.height - height)))
  };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const [x, y] = mainWindow.getPosition();
  fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
  fs.writeFileSync(stateFile(), JSON.stringify({ x, y }), 'utf8');
}

function showPet() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function hidePet() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.hide();
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'rj.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  tray = new Tray(icon);
  tray.setToolTip('窝头 RJ 桌面宠物');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 RJ', click: showPet },
    { label: '隐藏 RJ', click: hidePet },
    { type: 'separator' },
    {
      label: '退出宠物',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on('click', () => {
    if (mainWindow?.isVisible()) hidePet();
    else showPet();
  });
}

function createWindow() {
  const position = readWindowState();
  mainWindow = new BrowserWindow({
    ...windowSize,
    ...position,
    minWidth: 180,
    minHeight: 170,
    maxWidth: 760,
    maxHeight: 620,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, '..', 'assets', 'icons', 'rj.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('moved', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  Menu.setApplicationMenu(null);
  ipcMain.handle('pet:hide', hidePet);
  ipcMain.handle('pet:show', showPet);
  ipcMain.handle('pet:quit', () => {
    isQuitting = true;
    app.quit();
  });
  ipcMain.handle('pet:toggle-always-on-top', (_event, enabled) => {
    mainWindow?.setAlwaysOnTop(Boolean(enabled), 'floating');
    return mainWindow?.isAlwaysOnTop() ?? false;
  });
  ipcMain.handle('pet:get-autostart', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('pet:set-autostart', (_event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled), openAsHidden: false });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle('pet:move-window', (_event, dx, dy) => {
    if (!mainWindow) return;
    const [x, y] = mainWindow.getPosition();
    const { width, height } = mainWindow.getBounds();
    const next = constrainPosition(x + Number(dx || 0), y + Number(dy || 0), width, height);
    mainWindow.setPosition(next.x, next.y);
  });
  ipcMain.handle('pet:resize-window', (_event, width, height) => {
    if (!mainWindow) return;
    const safeWidth = Math.max(180, Math.min(760, Math.round(Number(width) || windowSize.width)));
    const safeHeight = Math.max(170, Math.min(620, Math.round(Number(height) || windowSize.height)));
    const [x, y] = mainWindow.getPosition();
    const next = constrainPosition(x, y, safeWidth, safeHeight);
    mainWindow.setBounds({ x: next.x, y: next.y, width: safeWidth, height: safeHeight }, true);
  });
  createTray();
  createWindow();
});

app.on('activate', showPet);

app.on('window-all-closed', (event) => {
  if (!isQuitting) event.preventDefault();
});
app.on('before-quit', () => {
  isQuitting = true;
  saveWindowState();
});
