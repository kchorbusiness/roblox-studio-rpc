local HttpService = game:GetService("HttpService")
local StudioService = game:GetService("StudioService")
local ScriptEditorService = game:GetService("ScriptEditorService")
local RunService = game:GetService("RunService")

local ENDPOINT = "http://127.0.0.1:54321/update"
local INTERVAL = 4

local lastPayload = ""
local elapsed = 0

RunService.Heartbeat:Connect(function(dt)
	elapsed += dt
	if elapsed < INTERVAL then return end
	elapsed = 0

	local gameName = game.Name or "Unknown Game"
	local scriptName = nil
	local line = nil

	local active = StudioService.ActiveScript
	if active then
		scriptName = active.Name
		pcall(function()
			local doc = ScriptEditorService:FindScriptDocument(active)
			if doc then
				line = doc:GetSelectionStart()
			end
		end)
	end

	local payload = HttpService:JSONEncode({ game = gameName, script = scriptName, line = line })
	if payload == lastPayload then return end
	lastPayload = payload

	pcall(function()
		HttpService:PostAsync(ENDPOINT, payload, Enum.HttpContentType.ApplicationJson, false)
	end)
end)
