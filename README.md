# Roblox Studio RPC
> Discord Rich Presence for Roblox Studio — shows your current game, script, and line number in real time.

![Discord Status Preview](https://i.imgur.com/placeholder.png)

---

## What it shows

```
🎮 Blackout Protocol [CAS]
📝 Editing: NPCModule — Line 247
⏱ 1 hour 23 minutes
```

---

## Requirements

- Windows 10/11
- [Node.js](https://nodejs.org) (LTS)
- Discord desktop app (must be running)
- Roblox Studio

---

## Setup

### 1. Discord App
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → name it `Roblox Studio` → Create
3. Copy the **Application ID** from General Information
4. Go to **Rich Presence → Art Assets** and upload two images:
   - Name one exactly `roblox_studio`
   - Name one exactly `editing`

### 2. Install & Run
```bash
git clone https://github.com/kchorbusiness/roblox-studio-rpc.git
cd roblox-studio-rpc
npm install
npm run dist
```
Run the installer from the `dist/` folder. The app starts in your **system tray**.

### 3. Enter your Client ID
Right-click the tray icon → **Setup Client ID** → paste your Application ID → **Save & Reconnect**

### 4. Studio Plugin
1. Copy `plugin/DiscordRPC.lua` to:
   ```
   %LOCALAPPDATA%\Roblox\Plugins\
   ```
2. Open Roblox Studio → **File → Studio Settings → Security**
3. Enable **Allow HTTP Requests**
4. Restart Studio

---

## How it works

```
Roblox Studio
    └── Plugin (Lua) polls active script + line every 4s
            └── HTTP POST → localhost:54321
                    └── Electron app (Node.js)
                            └── Discord IPC → Rich Presence
```

---

## Tray Icon Status

| Status | Meaning |
|--------|---------|
| `Discord: Connected (username)` | Everything working |
| `Discord: Disconnected` | Open Discord |
| `No Client ID` | Set your App ID in tray menu |
| `Studio: Idle` | No script open in Studio |

---

## License
MIT
