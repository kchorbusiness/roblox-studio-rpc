const RPC = require("discord-rpc");
const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");

const PORT = 54321;
const CONFIG_PATH = path.join(process.env.APPDATA || process.env.HOME, "roblox-studio-rpc-config.json");

let clientId = loadConfig() || "1514806686643388426";
let rpcClient = null;
let rpcReady = false;
let statusDiscord = "Disconnected";
let statusStudio = "Waiting...";
let onEvent = null;
let thumbnailCache = {};

let state = {
  game: "Unknown Game",
  placeId: null,
  script: null,
  scriptType: null,
  line: null,
  isPlaytest: false,
  isAnimation: false,
  startTimestamp: Date.now(),
};

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH)).clientId || ""; } catch { return ""; }
}

function saveConfig(id) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ clientId: id }));
}

function fetchThumbnail(placeId, cb) {
  if (!placeId || placeId === 0) return cb(null);
  if (thumbnailCache[placeId]) return cb(thumbnailCache[placeId]);

  const url = `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`;
  https.get(url, (res) => {
    let data = "";
    res.on("data", (chunk) => data += chunk);
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        const imageUrl = json.data?.[0]?.imageUrl || null;
        thumbnailCache[placeId] = imageUrl;
        cb(imageUrl);
      } catch { cb(null); }
    });
  }).on("error", () => cb(null));
}

function getSmallImage() {
  if (state.isPlaytest) return { key: "playtest", text: "Playtesting" };
  if (state.isAnimation) return { key: "animation", text: "Animation Editor" };
  if (!state.script) return { key: "idle", text: "Idle" };
  const map = {
    Script: { key: "server_script", text: "Server Script" },
    LocalScript: { key: "local_script", text: "Local Script" },
    ModuleScript: { key: "module_script", text: "Module Script" },
  };
  return map[state.scriptType] || { key: "server_script", text: "Script" };
}

function setActivity(thumbnailUrl) {
  if (!rpcReady || !rpcClient) return;

  const small = getSmallImage();
  let status = "Idle in Studio";
  if (state.isPlaytest) {
    status = "Playtesting";
  } else if (state.isAnimation) {
    status = "Animation Editor";
  } else if (state.script) {
    status = `Editing: ${state.script}`;
    if (state.line) status += ` — Line ${state.line}`;
  }

  statusStudio = status;

  rpcClient.setActivity({
    details: state.game || "Unknown Game",
    state: status,
    startTimestamp: state.startTimestamp,
    largeImageKey: thumbnailUrl || "roblox_studio",
    largeImageText: state.game || "Roblox Studio",
    smallImageKey: small.key,
    smallImageText: small.text,
    instance: false,
  }).catch(() => {
    rpcReady = false;
    statusDiscord = "Lost connection";
    setTimeout(connectRPC, 5000);
  });
}

function updateActivity() {
  if (state.placeId) {
    fetchThumbnail(state.placeId, (url) => setActivity(url));
  } else {
    setActivity(null);
  }
}

function connectRPC() {
  if (rpcClient) { try { rpcClient.destroy(); } catch {} rpcClient = null; rpcReady = false; }
  if (!clientId) { statusDiscord = "No Client ID set"; return; }

  RPC.register(clientId);
  rpcClient = new RPC.Client({ transport: "ipc" });
  rpcClient.on("ready", () => {
    rpcReady = true;
    statusDiscord = `Connected (${rpcClient.user.username})`;
    onEvent?.("Discord connected");
    updateActivity();
  });
  rpcClient.login({ clientId }).catch(() => {
    statusDiscord = "Discord not running";
    setTimeout(connectRPC, 10000);
  });
}

function startServer() {
  const app = express();
  app.use(express.json());

  app.post("/update", (req, res) => {
    const { game, placeId, script, scriptType, line, isPlaytest, isAnimation } = req.body;
    if (game !== state.game) { state.startTimestamp = Date.now(); thumbnailCache = {}; }
    state.game = game || "Unknown Game";
    state.placeId = placeId || null;
    state.script = script || null;
    state.scriptType = scriptType || null;
    state.line = line || null;
    state.isPlaytest = isPlaytest || false;
    state.isAnimation = isAnimation || false;
    statusStudio = state.script ? `${state.script} L${state.line || "?"}` : "Idle";
    updateActivity();
    res.sendStatus(200);
  });

  app.get("/ping", (_, res) => res.send("ok"));
  app.listen(PORT, "127.0.0.1");
}

module.exports = {
  start(cb) { onEvent = cb; startServer(); if (clientId) connectRPC(); },
  setClientId(id) { clientId = id; saveConfig(id); connectRPC(); },
  getClientId() { return clientId; },
  getStatus() { return { discord: statusDiscord, studio: statusStudio }; },
};