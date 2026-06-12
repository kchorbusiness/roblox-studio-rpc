const { app, Tray, Menu, nativeImage, BrowserWindow, dialog } = require("electron");
const path = require("path");
const bridge = require("./bridge");

app.setAppUserModelId("Roblox Studio RPC");

let tray = null;

function getIcon() {
  try {
    return nativeImage.createFromPath(path.join(__dirname, "assets", "icon.png"));
  } catch {
    return nativeImage.createEmpty();
  }
}

function buildMenu() {
  const status = bridge.getStatus();
  return Menu.buildFromTemplate([
    { label: "Roblox Studio RPC", enabled: false },
    { type: "separator" },
    { label: `Discord: ${status.discord}`, enabled: false },
    { label: `Studio: ${status.studio}`, enabled: false },
    { type: "separator" },
    {
      label: "Setup Client ID",
      click: () => {
        const win = new BrowserWindow({
          width: 420,
          height: 220,
          resizable: false,
          title: "Setup",
          webPreferences: { nodeIntegration: true, contextIsolation: false },
        });
        win.loadURL(`data:text/html,${encodeURIComponent(setupHTML())}`);
        win.setMenuBarVisibility(false);
      },
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
}

function setupHTML() {
  const current = bridge.getClientId();
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;background:#1e1e2e;color:#cdd6f4">
  <h3 style="margin:0 0 10px">Discord Application ID</h3>
  <p style="font-size:12px;color:#a6adc8;margin:0 0 10px">Get it from <b>discord.com/developers/applications</b></p>
  <input id="id" value="${current}" style="width:100%;padding:8px;box-sizing:border-box;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;font-size:14px" placeholder="Your App ID here">
  <button onclick="save()" style="margin-top:10px;padding:8px 20px;background:#89b4fa;border:none;border-radius:4px;cursor:pointer;font-weight:bold">Save & Reconnect</button>
  <script>
    const {ipcRenderer} = require("electron");
    function save() {
      const v = document.getElementById("id").value.trim();
      if (!v) return;
      ipcRenderer.send("save-client-id", v);
      window.close();
    }
  </script></body></html>`;
}

app.whenReady().then(() => {
  app.dock?.hide();

  tray = new Tray(getIcon());
  tray.setToolTip("Roblox Studio RPC");
  tray.setContextMenu(buildMenu());

  tray.on("right-click", () => {
    tray.setContextMenu(buildMenu());
    tray.popUpContextMenu();
  });

  bridge.start((event) => {
    tray.setToolTip(`RPC: ${event}`);
  });

  const { ipcMain } = require("electron");
  ipcMain.on("save-client-id", (_, id) => {
    bridge.setClientId(id);
  });

  setInterval(() => {
    tray.setContextMenu(buildMenu());
  }, 5000);
});

app.on("window-all-closed", (e) => e.preventDefault());
