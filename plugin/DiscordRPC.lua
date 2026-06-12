local HttpService = game:GetService("HttpService")
local StudioService = game:GetService("StudioService")
local ScriptEditorService = game:GetService("ScriptEditorService")
local RunService = game:GetService("RunService")

local ENDPOINT = "http://127.0.0.1:54321/update"
local INTERVAL = 1

local lastPayload = ""
local elapsed = 0

local function getScriptType(obj)
	if not obj then return nil end
	local t = obj.ClassName
	if t == "Script" then return "Script"
	elseif t == "LocalScript" then return "LocalScript"
	elseif t == "ModuleScript" then return "ModuleScript"
	end
	return "Script"
end

local function isAnimationEditor()
	-- Check if Animation Editor plugin window is open
	local ok, result = pcall(function()
		return game:GetService("PluginGuiService"):FindFirstChild("AnimationEditor") ~= nil
	end)
	return ok and result or false
end

RunService.Heartbeat:Connect(function(dt)
	elapsed += dt
	if elapsed < INTERVAL then return end
	elapsed = 0

	local gameName = "Unknown Game"
	pcall(function()
		if game.PlaceId ~= 0 then
			gameName = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name
		else
			gameName = game.Name
		end
	end)
	if gameName == nil or gameName == "" then gameName = game.Name or "Unknown Game" end

	local placeId = game.PlaceId ~= 0 and game.PlaceId or nil
	local active = StudioService.ActiveScript
	local scriptName = active and active.Name or nil
	local scriptType = getScriptType(active)
	local line = nil

	if active then
		pcall(function()
			local doc = ScriptEditorService:FindScriptDocument(active)
			if doc then line = doc:GetSelectionStart() end
		end)
	end

	local isPlaytest = RunService:IsRunning()
	local isAnimation = isAnimationEditor()

	local payload = HttpService:JSONEncode({
		game = gameName,
		placeId = placeId,
		script = scriptName,
		scriptType = scriptType,
		line = line,
		isPlaytest = isPlaytest,
		isAnimation = isAnimation,
	})

	if payload == lastPayload then return end
	lastPayload = payload

	pcall(function()
		HttpService:PostAsync(ENDPOINT, payload, Enum.HttpContentType.ApplicationJson, false)
	end)
end)