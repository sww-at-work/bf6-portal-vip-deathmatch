/**
 * HUD-UI implementation for VIP-Fiesta game mode
 *
 * This module manages the player HUD elements including:
 * - VIP status display (protecting your VIP or you are the VIP)
 * - Introduction message on first deployment
 */

import { CONFIG } from "./config.ts";
import { gameState } from "./state.ts";

// Constants for HUD positioning
const HUD_VIP_X = 0;
const HUD_VIP_Y = 70;
const HUD_VIP_WIDTH = 400;
const HUD_VIP_HEIGHT = 60;
const HUD_VIP_FONT_SIZE = 16;

// Store HUD widgets per player
const hudVipWidgets: Map<string, mod.UIWidget> = new Map();
const hudIntroWidgets: Map<string, mod.UIWidget> = new Map();

/**
 * Initialize HUD-UI for a player
 */
export function initializeHudUI(player: mod.Player): void {
    if (!CONFIG.ui.enableHud) return;

    createVipStatusWidget(player);
    showIntroductionIfNeeded(player);
}

/**
 * Create the VIP status widget for a player
 */
function createVipStatusWidget(player: mod.Player): void {
    const playerId = mod.GetObjId(player);
    const widgetName = "hud_vip_status_" + playerId;

    // Create container at top center
    mod.AddUIContainer(
        widgetName,
        mod.CreateVector(HUD_VIP_X, HUD_VIP_Y, 0),
        mod.CreateVector(HUD_VIP_WIDTH, HUD_VIP_HEIGHT, 0),
        mod.UIAnchor.TopCenter,
        mod.GetUIRoot(),
        true,
        0,
        mod.CreateVector(0, 0, 0),
        0,
        mod.UIBgFill.None,
        player
    );

    const container = mod.FindUIWidgetWithName(widgetName) as mod.UIWidget;
    if (container) {
        hudVipWidgets.set(widgetName, container);
        updateVipStatusWidget(player);
    }
}

/**
 * Update the VIP status widget for a player
 */
export function updateVipStatusWidget(player: mod.Player): void {
    if (!CONFIG.ui.enableHud) return;

    const playerId = mod.GetObjId(player);
    const playerTeamId = mod.GetObjId(mod.GetTeam(player));
    const widgetName = "hud_vip_status_" + playerId;
    const labelWidgetName = widgetName + "_label";

    // Get the container
    const container = hudVipWidgets.get(widgetName);
    if (!container) return;

    // Check if player is the VIP
    const teamVipId = gameState.teamVipById.get(playerTeamId);
    const isVip = teamVipId !== undefined && teamVipId === playerId;

    let message: mod.Message;
    let bgColor: mod.Vector;
    let textColor: mod.Vector;
    let fontSize = HUD_VIP_FONT_SIZE;

    if (isVip) {
        // You are the VIP
        message = mod.Message(mod.stringkeys.vipFiesta.hud.youAreVipShort);
        bgColor = mod.CreateVector(0.0, 0.8, 0.0); // Green
        textColor = mod.CreateVector(1.0, 1.0, 1.0); // White
        fontSize = 18;
    } else {
        // Show your team's VIP name
        const vipIdFromTeam = gameState.teamVipById.get(playerTeamId);
        let vipPlayer: mod.Player | undefined;

        if (vipIdFromTeam !== undefined && vipIdFromTeam !== -1) {
            // Find the VIP player by ID
            const allPlayers = mod.AllPlayers();
            const playerCount = mod.CountOf(allPlayers);

            for (let i = 0; i < playerCount; i++) {
                vipPlayer = mod.ValueInArray(allPlayers, i) as mod.Player;
                if (mod.GetObjId(vipPlayer) === vipIdFromTeam) {
                    break;
                }
            }
        }

        if (vipPlayer) {
            message = mod.Message(mod.stringkeys.vipFiesta.hud.yourVip, vipPlayer);
        } else {
            message = mod.Message(mod.stringkeys.vipFiesta.notifications.selectingNewVip);
        }
        bgColor = mod.CreateVector(0.1, 0.1, 0.1); // Dark gray
        textColor = mod.CreateVector(1.0, 1.0, 1.0); // White
    }

    // Get existing label or create new one
    let label = hudVipWidgets.get(labelWidgetName);
    if (!label) {
        // Create new label
        mod.AddUIText(
            labelWidgetName,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(HUD_VIP_WIDTH, HUD_VIP_HEIGHT, 0),
            mod.UIAnchor.TopLeft,
            container,
            true,
            2,
            bgColor,
            0.8,
            mod.UIBgFill.Blur,
            message,
            fontSize,
            textColor,
            1.0,
            mod.UIAnchor.Center,
            player
        );

        label = mod.FindUIWidgetWithName(labelWidgetName) as mod.UIWidget;
        if (label) {
            hudVipWidgets.set(labelWidgetName, label);
        }
    } else {
        // Update existing label using setters
        mod.SetUITextLabel(label, message);
        mod.SetUITextSize(label, fontSize);
        mod.SetUITextColor(label, textColor);
        mod.SetUIWidgetBgColor(label, bgColor);
    }
}


/**
 * Show introduction message on first deployment
 */
function showIntroductionIfNeeded(player: mod.Player): void {
    const playerId = mod.GetObjId(player);

    // Check if already shown for this player
    if (gameState.firstDeployByPlayerId.has(playerId)) {
        return;
    }

    const widgetName = "hud_intro_" + playerId;

    // Create intro message at top center, below VIP status
    mod.AddUIText(
        widgetName,
        mod.CreateVector(0, HUD_VIP_Y + HUD_VIP_HEIGHT + 10, 0),
        mod.CreateVector(500, 50, 0),
        mod.UIAnchor.TopCenter,
        mod.GetUIRoot(),
        true,
        1,
        mod.CreateVector(0.0, 0.0, 0.0),
        0.7,
        mod.UIBgFill.Solid,
        mod.Message(mod.stringkeys.vipFiesta.notifications.gameStarting),
        14,
        mod.CreateVector(1.0, 1.0, 1.0),
        1.0,
        mod.UIAnchor.Center,
        player
    );

    const intro = mod.FindUIWidgetWithName(widgetName) as mod.UIWidget;
    if (intro) {
        hudIntroWidgets.set(widgetName, intro);
        gameState.firstDeployByPlayerId.add(playerId);

        // Auto-remove after 3 seconds
        (async () => {
            await mod.Wait(3);
            try {
                mod.DeleteUIWidget(intro);
            } catch (error) {
                console.log("Could not delete intro widget: " + widgetName, error);
            }
            hudIntroWidgets.delete(widgetName);
        })();
    }
}

/**
 * Remove HUD widgets for a leaving player
 */
export function removeHudUIForPlayer(playerId: number): void {
    const widgetPrefix = "hud_vip_status_" + playerId;
    const introPrefix = "hud_intro_" + playerId;

    // Clean up VIP status widgets
    for (const [key, widget] of hudVipWidgets.entries()) {
        if (key.startsWith(widgetPrefix)) {
            mod.DeleteUIWidget(widget);
            hudVipWidgets.delete(key);
        }
    }

    // Clean up intro widgets
    for (const [key, widget] of hudIntroWidgets.entries()) {
        if (key.startsWith(introPrefix)) {
            mod.DeleteUIWidget(widget);
            hudIntroWidgets.delete(key);
        }
    }
}
