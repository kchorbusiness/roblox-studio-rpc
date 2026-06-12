const RPC = require("discord-rpc");
const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = 54321;
const CONFIG_PATH = path.join(
  process.env.APPDATA || process.env.HOME,
  "roblox-studio-rpc-config.json"
);

let clientId = loadConfig();
let rpcClient = null;
let rpcReady = false;
let statusDiscord = "Disconnected";
let statusStudio = "Waiting...";
let onEvent = null;

let state = {
  game: "Unknown Game",
  script: null,
  line: null,
  startTimestamp: Date.now(),
};

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH)).clientId || "";
  } catch {
    return "";
  }
}

function saveConfig(id) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ clientId: id }));
}

function connectRPC() {
  if (rpcClient) {
    try { rpcClient.destroy(); } catch {}
    rpcClient = null;
    rpcReady = false;
  }

  if (!clientId) {
    statusDiscord = "No Client ID set";
    return;
  }

  RPC.register(clientId);
  rpcClient = new RPC.Client({ transport: "ipc" });

  rpcClient.on("ready", () => {
    rpcReady = true;
    statusDiscord = `Connected (${rpcClient.user.username})`;
    onEvent?.("Discord connected");
    setActivity();
  });

  rpcClient.login({ clientId }).catch((err) => {
    statusDiscord = "Discord not running";
    setTimeout(connectRPC, 10000);
  });
}

function setActivity() {
  if (!rpcReady || !rpcClient) return;

  let details = state.game || "Unknown Game";
  let status = "Idle in Studio";
  if (state.script) {
    status = `Editing: ${state.script}`;
    if (state.line) status += ` — Line ${state.line}`;
  }

  statusStudio = status;

  rpcClient.setActivity({
    details,
    state: status,
    startTimestamp: state.startTimestamp,
    largeImageKey: "roblox_studio",
    largeImageText: "Roblox Studio",
    smallImageKey: "editing",
    smallImageText: state.script || "Studio",
    instance: false,
  }).catch(() => {
    rpcReady = false;
    statusDiscord = "Lost connection";
    setTimeout(connectRPC, 5000);
  });
}

function startServer() {
  const app = express();
  app.use(express.json());

  app.post("/update", (req, res) => {
    const { game, script, line } = req.body;
    if (game !== state.game) state.startTimestamp = Date.now();
    state.game = game || "Unknown Game";
    state.script = script || null;
    state.line = line || null;
    statusStudio = state.script ? `${state.script} L${state.line || "?"}` : "Idle";
    setActivity();
    res.sendStatus(200);
  });

  app.get("/ping", (_, res) => res.send("ok"));

  app.listen(PORT, "127.0.0.1");
}

module.exports = {
  start(cb) {
    onEvent = cb;
    startServer();
    if (clientId) connectRPC();
  },
  setClientId(id) {
    clientId = id;
    saveConfig(id);
    connectRPC();
  },
  getClientId() {
    return clientId;
  },
  getStatus() {
    return { discord: statusDiscord, studio: statusStudio };
  },
};
