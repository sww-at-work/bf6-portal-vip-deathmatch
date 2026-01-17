/**
 * Score UI implementation for VIP-Fiesta game mode
 * 
 * This module manages the real-time score display at the bottom left of the screen,
 * showing VIP kills per team with progress bars, team ranks, and highlighting the player's team.
 */

import { CONFIG } from './config.ts';
import { gameState, type TeamScoreInfo } from './state.ts';

// Constants
const MAX_TEAMS_DISPLAYED = 3;
const MIN_PROGRESS_BAR_WIDTH = 2;
const SCORE_UI_X = 20;
const SCORE_UI_Y = 20;
const SCORE_UI_WIDTH = 400;
const SCORE_UI_HEIGHT = 250;
const HEADER_HEIGHT = 30;
const HEADER_FONT_SIZE = 20;
const TIME_WIDGET_HEIGHT = 25;
const TIME_WIDGET_SPACING = 0;
const TEAM_ENTRY_HEIGHT = 60;
const TEAM_ENTRY_SPACING = 0;

// Store UI widgets for updating
const scoreUIWidgets: Map<string, mod.UIWidget> = new Map();

// Store last displayed teams per player to detect changes
const lastDisplayedTeams: Map<number, TeamScoreInfo[]> = new Map();

/**
 * Create a time remaining message using numeric placeholders,
 * selecting the appropriate string key for zero-padded cases.
 */
function getTimeRemainingMessage(minutes: number, seconds: number): mod.Message {
    const minUnder10 = minutes < 10;
    const secUnder10 = seconds < 10;
    if (!minUnder10 && !secUnder10) {
        return mod.Message(mod.stringkeys.vipFiesta.hud.timeRemainingMMSS, minutes, seconds);
    } else if (!minUnder10 && secUnder10) {
        return mod.Message(mod.stringkeys.vipFiesta.hud.timeRemainingMM0SS, minutes, seconds);
    } else if (minUnder10 && !secUnder10) {
        return mod.Message(mod.stringkeys.vipFiesta.hud.timeRemaining0MMSS, minutes, seconds);
    } else {
        return mod.Message(mod.stringkeys.vipFiesta.hud.timeRemaining0MM0SS, minutes, seconds);
    }
}

/**
 * Get team color based on team ID
 * Handles team ID 0 (neutral team) gracefully
 */
function getTeamColor(teamId: number): mod.Vector {
    // Using BF team colors: Team 1 (blue), Team 2 (orange/red), etc.
    const colors = [
        mod.CreateVector(0.2, 0.5, 1.0),   // Team 1: Blue
        mod.CreateVector(1.0, 0.4, 0.2),   // Team 2: Orange/Red
        mod.CreateVector(0.2, 1.0, 0.5),   // Team 3: Green
        mod.CreateVector(1.0, 1.0, 0.2),   // Team 4: Yellow
        mod.CreateVector(0.8, 0.2, 1.0),   // Team 5: Purple
        mod.CreateVector(1.0, 0.6, 0.8),   // Team 6: Pink
    ];

    // Handle neutral team (ID 0) or invalid IDs
    if (teamId <= 0) {
        return mod.CreateVector(0.5, 0.5, 0.5); // Gray for neutral/invalid
    }

    const index = (teamId - 1) % colors.length;
    return colors[index];
}

/**
 * Get rank suffix (1st, 2nd, 3rd, 4th, etc.)
 */
// Rank suffixes are handled via string keys in label composition.

/**
 * Get the teams to display in the score UI for a specific player
 * Uses cached sorted team scores for better performance
 * - Shows top 3 teams
 * - Always includes the player's team if not in top 3
 */
function getTeamsToDisplay(player: mod.Player): TeamScoreInfo[] {
    const allScores = gameState.sortedTeamScores;
    const playerTeamId = mod.GetObjId(mod.GetTeam(player));

    // Get top teams
    const topTeams = allScores.slice(0, MAX_TEAMS_DISPLAYED);

    // Check if player's team is in top teams
    const playerTeamInTop = topTeams.some(t => t.teamId === playerTeamId);

    if (playerTeamInTop || allScores.length <= MAX_TEAMS_DISPLAYED) {
        return topTeams;
    }

    // Player's team is not in top teams, show top 2 and player's team
    const playerTeamInfo = allScores.find(t => t.teamId === playerTeamId);
    if (playerTeamInfo) {
        return [topTeams[0], topTeams[1], playerTeamInfo];
    }

    return topTeams;
}

/**
 * Create the score UI for a specific player
 */
function createScoreUIForPlayer(player: mod.Player): void {
    const playerId = mod.GetObjId(player);
    const widgetPrefix = "scoreUI_" + playerId;

    // Main container at top left (avoid minimap overlap)
    // Position below header and time widget
    const containerY = SCORE_UI_Y + HEADER_HEIGHT + TIME_WIDGET_SPACING + TIME_WIDGET_HEIGHT;
    mod.AddUIContainer(
        widgetPrefix + "_main",
        mod.CreateVector(SCORE_UI_X, containerY, 0),
        mod.CreateVector(SCORE_UI_WIDTH, SCORE_UI_HEIGHT, 0),
        mod.UIAnchor.TopLeft,
        mod.GetUIRoot(),
        true,
        0,
        mod.CreateVector(0, 0, 0),
        0,
        mod.UIBgFill.None,
        player
    );
    const mainContainer = mod.FindUIWidgetWithName(widgetPrefix + "_main") as mod.UIWidget;
    if (!mainContainer) {
        return;
    }
    scoreUIWidgets.set(widgetPrefix + "_main", mainContainer);

    // Ensure global target header exists once for all players
    ensureGlobalTargetHeader();

    // Update the score display
    updateScoreUIForPlayer(player);
}

/**
 * Update the score UI for a specific player
 */
function updateScoreUIForPlayer(player: mod.Player): void {
    const playerId = mod.GetObjId(player);
    const playerTeamId = mod.GetObjId(mod.GetTeam(player));
    const widgetPrefix = "scoreUI_" + playerId;

    const mainContainer = scoreUIWidgets.get(widgetPrefix + "_main");
    if (!mainContainer) return;

    const teamsToDisplay = getTeamsToDisplay(player);
    const lastTeams = lastDisplayedTeams.get(playerId) || [];

    // Check if team list structure changed (different teams or order)
    const teamsChanged = teamsToDisplay.length !== lastTeams.length ||
        teamsToDisplay.some((t, i) => t.teamId !== lastTeams[i]?.teamId);

    if (teamsChanged) {
        // Recreate all team entries if the team list changed
        for (let i = 0; i < MAX_TEAMS_DISPLAYED; i++) {
            const teamEntryKey = widgetPrefix + "_team_" + i;
            deleteTeamEntry(teamEntryKey);
        }

        // Create new team entries
        for (let i = 0; i < teamsToDisplay.length; i++) {
            createTeamEntry(player, playerId, playerTeamId, widgetPrefix, teamsToDisplay[i], i);
        }

        lastDisplayedTeams.set(playerId, teamsToDisplay);
    } else {
        // Update existing team entries
        for (let i = 0; i < teamsToDisplay.length; i++) {
            updateTeamEntry(player, playerId, playerTeamId, widgetPrefix, teamsToDisplay[i], i);
        }
    }
}

/**
 * Delete a team entry and all its child widgets
 */
function deleteTeamEntry(teamEntryKey: string): void {
    const existingWidget = scoreUIWidgets.get(teamEntryKey);
    if (existingWidget) {
        try {
            mod.DeleteUIWidget(existingWidget);
        } catch (error) {
            console.log("Could not delete widget " + teamEntryKey + ":", error);
        }
        // Remove all child widgets from map
        for (const key of scoreUIWidgets.keys()) {
            if (key.startsWith(teamEntryKey)) {
                scoreUIWidgets.delete(key);
            }
        }
    }
}

/**
 * Create a new team entry with all its widgets
 */
function createTeamEntry(
    player: mod.Player,
    playerId: number,
    playerTeamId: number,
    widgetPrefix: string,
    teamInfo: TeamScoreInfo,
    index: number
): void {
    const mainContainer = scoreUIWidgets.get(widgetPrefix + "_main");
    if (!mainContainer) return;

    const isPlayerTeam = teamInfo.teamId === playerTeamId;
    const yOffset = 0;
    const entryHeight = TEAM_ENTRY_HEIGHT;
    const entrySpacing = TEAM_ENTRY_SPACING;
    const yPos = yOffset + index * (entryHeight + entrySpacing);

    // Team entry container
    mod.AddUIContainer(
        widgetPrefix + "_team_" + index,
        mod.CreateVector(0, yPos, 0),
        mod.CreateVector(SCORE_UI_WIDTH, entryHeight, 0),
        mod.UIAnchor.TopLeft,
        mainContainer,
        true,
        4,
        isPlayerTeam ? mod.CreateVector(0.3, 0.3, 0.3) : mod.CreateVector(0.1, 0.1, 0.1),
        isPlayerTeam ? 0.9 : 0.7,
        mod.UIBgFill.Solid,
        player
    );
    const teamContainer = mod.FindUIWidgetWithName(widgetPrefix + "_team_" + index) as mod.UIWidget;
    if (!teamContainer) return;
    scoreUIWidgets.set(widgetPrefix + "_team_" + index, teamContainer);

    // Rank and team label (left side)
    const labelMessage = getTeamLabelMessage(teamInfo, isPlayerTeam);

    mod.AddUIText(
        widgetPrefix + "_team_" + index + "_label",
        mod.CreateVector(8, 0, 0),
        mod.CreateVector(150, entryHeight, 0),
        mod.UIAnchor.TopLeft,
        teamContainer,
        true,
        0,
        mod.CreateVector(0, 0, 0),
        0,
        mod.UIBgFill.None,
        labelMessage,
        isPlayerTeam ? 16 : 14,
        mod.CreateVector(1, 1, 1),
        1,
        mod.UIAnchor.CenterLeft,
        player
    );

    // Progress bar background
    const progressBarWidth = 180;
    const progressBarHeight = 20;
    const progressBarX = 160;
    const progressBarY = (entryHeight - progressBarHeight) / 2;

    mod.AddUIContainer(
        widgetPrefix + "_team_" + index + "_progress_bg",
        mod.CreateVector(progressBarX, progressBarY, 0),
        mod.CreateVector(progressBarWidth, progressBarHeight, 0),
        mod.UIAnchor.TopLeft,
        teamContainer,
        true,
        0,
        mod.CreateVector(0.1, 0.1, 0.1),
        0.8,
        mod.UIBgFill.Solid,
        player
    );
    const progressBg = mod.FindUIWidgetWithName(widgetPrefix + "_team_" + index + "_progress_bg") as mod.UIWidget;
    if (!progressBg) return;

    // Progress bar fill
    const targetKills = Math.max(CONFIG.targetVipKills, 1);
    const progress = Math.min(teamInfo.vipKills / targetKills, 1.0);
    const fillWidth = Math.max(progressBarWidth * progress, MIN_PROGRESS_BAR_WIDTH);
    const teamColor = getTeamColor(teamInfo.teamId);

    mod.AddUIImage(
        widgetPrefix + "_team_" + index + "_progress_fill",
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(fillWidth, progressBarHeight, 0),
        mod.UIAnchor.TopLeft,
        progressBg,
        true,
        0,
        teamColor,
        0.9,
        mod.UIBgFill.Solid,
        mod.UIImageType.None,
        teamColor,
        1,
        player
    );
    const progressFill = mod.FindUIWidgetWithName(widgetPrefix + "_team_" + index + "_progress_fill") as mod.UIWidget;
    if (progressFill) {
        scoreUIWidgets.set(widgetPrefix + "_team_" + index + "_progress_fill", progressFill);
    }

    // Score text (right side)
    mod.AddUIText(
        widgetPrefix + "_team_" + index + "_score",
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(50, entryHeight, 0),
        mod.UIAnchor.TopRight,
        teamContainer,
        true,
        0,
        mod.CreateVector(0, 0, 0),
        0,
        mod.UIBgFill.None,
        mod.Message(mod.stringkeys.vipFiesta.ui.plainNumber, teamInfo.vipKills),
        16,
        mod.CreateVector(1, 1, 1),
        1,
        mod.UIAnchor.CenterRight,
        player
    );
}

/**
 * Update an existing team entry using setters
 */
function updateTeamEntry(
    player: mod.Player,
    playerId: number,
    playerTeamId: number,
    widgetPrefix: string,
    teamInfo: TeamScoreInfo,
    index: number
): void {
    const isPlayerTeam = teamInfo.teamId === playerTeamId;

    // Update team container background
    const teamContainer = scoreUIWidgets.get(widgetPrefix + "_team_" + index);
    if (teamContainer) {
        mod.SetUIWidgetBgColor(
            teamContainer,
            isPlayerTeam ? mod.CreateVector(0.3, 0.3, 0.3) : mod.CreateVector(0.1, 0.1, 0.1)
        );
        mod.SetUIWidgetBgAlpha(teamContainer, isPlayerTeam ? 0.9 : 0.7);
    }

    // Update label text
    const labelWidget = mod.FindUIWidgetWithName(widgetPrefix + "_team_" + index + "_label") as mod.UIWidget;
    if (labelWidget) {
        const labelMessage = getTeamLabelMessage(teamInfo, isPlayerTeam);
        mod.SetUITextLabel(labelWidget, labelMessage);
        mod.SetUITextSize(labelWidget, isPlayerTeam ? 16 : 14);
    }

    // Update progress bar fill
    const progressBarWidth = 180;
    const targetKills = Math.max(CONFIG.targetVipKills, 1);
    const progress = Math.min(teamInfo.vipKills / targetKills, 1.0);
    const fillWidth = Math.max(progressBarWidth * progress, MIN_PROGRESS_BAR_WIDTH);
    const teamColor = getTeamColor(teamInfo.teamId);

    const progressFill = scoreUIWidgets.get(widgetPrefix + "_team_" + index + "_progress_fill");
    if (progressFill) {
        mod.SetUIWidgetSize(progressFill, mod.CreateVector(fillWidth, 20, 0));
        mod.SetUIImageColor(progressFill, teamColor);
    }

    // Update score text
    const scoreWidget = mod.FindUIWidgetWithName(widgetPrefix + "_team_" + index + "_score") as mod.UIWidget;
    if (scoreWidget) {
        mod.SetUITextLabel(scoreWidget, mod.Message(mod.stringkeys.vipFiesta.ui.plainNumber, teamInfo.vipKills));
    }
}

/**
 * Get the appropriate label message for a team entry
 */
function getTeamLabelMessage(teamInfo: TeamScoreInfo, isPlayerTeam: boolean): mod.Message {
    const teamName = teamInfo.teamId;
    if (isPlayerTeam) {
        if (teamInfo.rank === 1) return mod.Message(mod.stringkeys.vipFiesta.ui.teamLabelYou1st, teamName);
        else if (teamInfo.rank === 2) return mod.Message(mod.stringkeys.vipFiesta.ui.teamLabelYou2nd, teamName);
        else if (teamInfo.rank === 3) return mod.Message(mod.stringkeys.vipFiesta.ui.teamLabelYou3rd, teamName);
        else return mod.Message(mod.stringkeys.vipFiesta.ui.teamLabelYouNth, teamInfo.rank, teamName);
    } else {
        if (teamInfo.rank === 1) return mod.Message(mod.stringkeys.vipFiesta.ui.teamLabel1st, teamName);
        else if (teamInfo.rank === 2) return mod.Message(mod.stringkeys.vipFiesta.ui.teamLabel2nd, teamName);
        else if (teamInfo.rank === 3) return mod.Message(mod.stringkeys.vipFiesta.ui.teamLabel3rd, teamName);
        else return mod.Message(mod.stringkeys.vipFiesta.ui.teamLabelNth, teamInfo.rank, teamName);
    }
}

/**
 * Create a single global target score header for all players
 */
function ensureGlobalTargetHeader(): void {
    const globalHeaderName = "scoreUI_global_header";
    const existing = mod.FindUIWidgetWithName(globalHeaderName) as mod.UIWidget;
    if (existing) {
        scoreUIWidgets.set(globalHeaderName, existing);
        ensureGlobalTimeWidget();
        return;
    }
    // Create a global text widget at top-left
    mod.AddUIText(
        globalHeaderName,
        mod.CreateVector(SCORE_UI_X, SCORE_UI_Y, 0),
        mod.CreateVector(SCORE_UI_WIDTH, HEADER_HEIGHT, 0),
        mod.UIAnchor.TopLeft,
        mod.GetUIRoot(),
        true,
        0,
        mod.CreateVector(0.1, 0.1, 0.1),
        0.7,
        mod.UIBgFill.Solid,
        mod.Message(mod.stringkeys.vipFiesta.ui.targetHeader, CONFIG.targetVipKills),
        HEADER_FONT_SIZE,
        mod.CreateVector(1, 1, 1),
        1,
        mod.UIAnchor.Center
    );
    const header = mod.FindUIWidgetWithName(globalHeaderName) as mod.UIWidget;
    if (header) {
        scoreUIWidgets.set(globalHeaderName, header);
    }

    // Create global time widget below the header
    ensureGlobalTimeWidget();
}

/**
 * Create a single global time widget for all players
 */
function ensureGlobalTimeWidget(): void {
    const globalTimeName = "scoreUI_global_time";
    const existing = mod.FindUIWidgetWithName(globalTimeName) as mod.UIWidget;
    if (existing) {
        scoreUIWidgets.set(globalTimeName, existing);
        return;
    }

    // Create time widget below the header
    const remainingTime = mod.GetMatchTimeRemaining();
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);
    const timeMsg = getTimeRemainingMessage(minutes, seconds);
    mod.AddUIText(
        globalTimeName,
        mod.CreateVector(SCORE_UI_X, SCORE_UI_Y + HEADER_HEIGHT + TIME_WIDGET_SPACING, 0),
        mod.CreateVector(SCORE_UI_WIDTH, TIME_WIDGET_HEIGHT, 0),
        mod.UIAnchor.TopLeft,
        mod.GetUIRoot(),
        true,
        0,
        mod.CreateVector(0.1, 0.1, 0.1),
        0.7,
        mod.UIBgFill.Solid,
        timeMsg,
        14,
        mod.CreateVector(1, 1, 1),
        1,
        mod.UIAnchor.Center
    );
    const timeWidget = mod.FindUIWidgetWithName(globalTimeName) as mod.UIWidget;
    if (timeWidget) {
        scoreUIWidgets.set(globalTimeName, timeWidget);
    }
}

/**
 * Update the global time widget
 * Call this function every second to refresh the time display
 */
export function updateTimeWidget(): void {
    if (!CONFIG.ui.enableHud) return;

    const globalTimeName = "scoreUI_global_time";
    const timeWidget = scoreUIWidgets.get(globalTimeName);
    if (!timeWidget) return;

    const remainingTime = mod.GetMatchTimeRemaining();
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);
    const timeMsg = getTimeRemainingMessage(minutes, seconds);
    mod.SetUITextLabel(timeWidget, timeMsg);
}


/**
 * Initialize score UI for all players
 */
export function initializeScoreUI(): void {
    if (!CONFIG.ui.enableHud) return;

    const allPlayers = mod.AllPlayers();
    const playerCount = mod.CountOf(allPlayers);

    for (let i = 0; i < playerCount; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        createScoreUIForPlayer(player);
    }
}

/**
 * Update score UI for all players
 */
export function updateScoreUI(): void {
    if (!CONFIG.ui.enableHud) return;

    const allPlayers = mod.AllPlayers();
    const playerCount = mod.CountOf(allPlayers);

    for (let i = 0; i < playerCount; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        updateScoreUIForPlayer(player);
    }
}

/**
 * Create score UI for a newly joined player
 */
export function createScoreUIForNewPlayer(player: mod.Player): void {
    if (!CONFIG.ui.enableHud) return;
    createScoreUIForPlayer(player);
}

/**
 * Remove score UI for a leaving player
 */
export function removeScoreUIForPlayer(playerId: number): void {
    const widgetPrefix = "scoreUI_" + playerId;

    // Clean up all widgets for this player
    for (const [key, widget] of scoreUIWidgets.entries()) {
        if (key.startsWith(widgetPrefix)) {
            try {
                mod.DeleteUIWidget(widget);
            } catch (error) {
                // Widget might already be deleted or invalid
                console.log("Could not delete widget " + key + ":", error);
            }
            scoreUIWidgets.delete(key);
        }
    }
}

/**
 * Show a global full-screen black overlay with the score UI centered.
 * Intended for end-of-round presentation.
 */
export function showEndOfRoundOverlay(winningTeamId?: number): void {
    // Create a full-screen black container
    const overlayName = "scoreUI_end_round_overlay";
    const existingOverlay = mod.FindUIWidgetWithName(overlayName) as mod.UIWidget;
    if (!existingOverlay) {
        // Use a large size to cover the whole screen across resolutions
        mod.AddUIContainer(
            overlayName,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(4000, 3000, 0),
            mod.UIAnchor.TopLeft,
            mod.GetUIRoot(),
            true,
            100, // draw order above most HUD
            mod.CreateVector(0, 0, 0),
            1.0,
            mod.UIBgFill.Solid
        );
    }
    const overlay = mod.FindUIWidgetWithName(overlayName) as mod.UIWidget;
    if (!overlay) return;
    // Ensure the overlay renders above the in-game HUD/UI
    try { mod.SetUIWidgetDepth(overlay, mod.UIDepth.AboveGameUI); } catch { }

    // Add a top-center "Round Over" banner above the overlay
    const titleName = "scoreUI_end_round_title";
    let titleWidget = mod.FindUIWidgetWithName(titleName) as mod.UIWidget;
    if (!titleWidget) {
        mod.AddUIText(
            titleName,
            mod.CreateVector(0, 20, 0),
            mod.CreateVector(600, 60, 0),
            mod.UIAnchor.TopCenter,
            mod.GetUIRoot(),
            true,
            101,
            mod.CreateVector(0, 0, 0),
            0.0,
            mod.UIBgFill.None,
            mod.Message(mod.stringkeys.vipFiesta.ui.roundOver),
            28,
            mod.CreateVector(1, 1, 1),
            1,
            mod.UIAnchor.Center
        );
        titleWidget = mod.FindUIWidgetWithName(titleName) as mod.UIWidget;
    }
    try { if (titleWidget) mod.SetUIWidgetDepth(titleWidget, mod.UIDepth.AboveGameUI); } catch { }

    // Centered container to house the score UI
    const contentName = "scoreUI_end_round_overlay_content";
    let content = mod.FindUIWidgetWithName(contentName) as mod.UIWidget;
    if (!content) {
        const totalHeight = HEADER_HEIGHT + TIME_WIDGET_SPACING + TIME_WIDGET_HEIGHT + (TEAM_ENTRY_HEIGHT + TEAM_ENTRY_SPACING) * Math.min(gameState.sortedTeamScores.length, MAX_TEAMS_DISPLAYED);
        mod.AddUIContainer(
            contentName,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(SCORE_UI_WIDTH, totalHeight, 0),
            mod.UIAnchor.Center,
            overlay,
            true,
            101,
            mod.CreateVector(0, 0, 0),
            0.0,
            mod.UIBgFill.None
        );
        content = mod.FindUIWidgetWithName(contentName) as mod.UIWidget;
        if (!content) return;
        try { mod.SetUIWidgetDepth(content, mod.UIDepth.AboveGameUI); } catch { }

        // Header: show winner team if available, else show target kills
        const headerMessage = (winningTeamId !== undefined)
            ? mod.Message(mod.stringkeys.vipFiesta.ui.roundOverWinner, winningTeamId)
            : mod.Message(mod.stringkeys.vipFiesta.ui.targetHeader, CONFIG.targetVipKills);
        mod.AddUIText(
            contentName + "_header",
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(SCORE_UI_WIDTH, HEADER_HEIGHT, 0),
            mod.UIAnchor.TopLeft,
            content,
            true,
            0,
            mod.CreateVector(0.1, 0.1, 0.1),
            0.9,
            mod.UIBgFill.Solid,
            headerMessage,
            HEADER_FONT_SIZE,
            mod.CreateVector(1, 1, 1),
            1,
            mod.UIAnchor.Center
        );
        const hdr = mod.FindUIWidgetWithName(contentName + "_header") as mod.UIWidget;
        try { if (hdr) mod.SetUIWidgetDepth(hdr, mod.UIDepth.AboveGameUI); } catch { }

        // Time widget (shows remaining at the moment of overlay)
        const overlayRemainingTime = mod.GetMatchTimeRemaining();
        const oMinutes = Math.floor(overlayRemainingTime / 60);
        const oSeconds = Math.floor(overlayRemainingTime % 60);
        const oTimeMsg = getTimeRemainingMessage(oMinutes, oSeconds);
        mod.AddUIText(
            contentName + "_time",
            mod.CreateVector(0, HEADER_HEIGHT + TIME_WIDGET_SPACING, 0),
            mod.CreateVector(SCORE_UI_WIDTH, TIME_WIDGET_HEIGHT, 0),
            mod.UIAnchor.TopLeft,
            content,
            true,
            0,
            mod.CreateVector(0.1, 0.1, 0.1),
            0.9,
            mod.UIBgFill.Solid,
            oTimeMsg,
            14,
            mod.CreateVector(1, 1, 1),
            1,
            mod.UIAnchor.Center
        );
        const timeHdr = mod.FindUIWidgetWithName(contentName + "_time") as mod.UIWidget;
        try { if (timeHdr) mod.SetUIWidgetDepth(timeHdr, mod.UIDepth.AboveGameUI); } catch { }

        // Render top teams centered beneath time
        const yOffset = HEADER_HEIGHT + TIME_WIDGET_SPACING + TIME_WIDGET_HEIGHT;
        const teamsToDisplay = gameState.sortedTeamScores.slice(0, MAX_TEAMS_DISPLAYED);
        for (let i = 0; i < teamsToDisplay.length; i++) {
            const teamInfo = teamsToDisplay[i];
            const entryName = contentName + `_team_${i}`;

            // Team container
            mod.AddUIContainer(
                entryName,
                mod.CreateVector(0, yOffset + i * (TEAM_ENTRY_HEIGHT + TEAM_ENTRY_SPACING), 0),
                mod.CreateVector(SCORE_UI_WIDTH, TEAM_ENTRY_HEIGHT, 0),
                mod.UIAnchor.TopLeft,
                content,
                true,
                0,
                mod.CreateVector(0.1, 0.1, 0.1),
                0.85,
                mod.UIBgFill.Solid
            );
            const teamContainer = mod.FindUIWidgetWithName(entryName) as mod.UIWidget;
            if (!teamContainer) continue;

            // Label (rank + team id)
            const labelMessage = getTeamLabelMessage(teamInfo, false);
            mod.AddUIText(
                entryName + "_label",
                mod.CreateVector(8, 0, 0),
                mod.CreateVector(150, TEAM_ENTRY_HEIGHT, 0),
                mod.UIAnchor.TopLeft,
                teamContainer,
                true,
                0,
                mod.CreateVector(0, 0, 0),
                0,
                mod.UIBgFill.None,
                labelMessage,
                14,
                mod.CreateVector(1, 1, 1),
                1,
                mod.UIAnchor.CenterLeft
            );

            // Progress bar
            const progressBarWidth = 180;
            const progressBarHeight = 20;
            const progressBarX = 160;
            const progressBarY = (TEAM_ENTRY_HEIGHT - progressBarHeight) / 2;
            mod.AddUIContainer(
                entryName + "_progress_bg",
                mod.CreateVector(progressBarX, progressBarY, 0),
                mod.CreateVector(progressBarWidth, progressBarHeight, 0),
                mod.UIAnchor.TopLeft,
                teamContainer,
                true,
                0,
                mod.CreateVector(0.1, 0.1, 0.1),
                0.8,
                mod.UIBgFill.Solid
            );
            const progressBg = mod.FindUIWidgetWithName(entryName + "_progress_bg") as mod.UIWidget;
            if (progressBg) {
                const targetKills = Math.max(CONFIG.targetVipKills, 1);
                const progress = Math.min(teamInfo.vipKills / targetKills, 1.0);
                const fillWidth = Math.max(progressBarWidth * progress, MIN_PROGRESS_BAR_WIDTH);
                const teamColor = getTeamColor(teamInfo.teamId);

                mod.AddUIImage(
                    entryName + "_progress_fill",
                    mod.CreateVector(0, 0, 0),
                    mod.CreateVector(fillWidth, progressBarHeight, 0),
                    mod.UIAnchor.TopLeft,
                    progressBg,
                    true,
                    0,
                    teamColor,
                    0.9,
                    mod.UIBgFill.Solid,
                    mod.UIImageType.None,
                    teamColor,
                    1
                );
            }

            // Score value (right)
            mod.AddUIText(
                entryName + "_score",
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(50, TEAM_ENTRY_HEIGHT, 0),
                mod.UIAnchor.TopRight,
                teamContainer,
                true,
                0,
                mod.CreateVector(0, 0, 0),
                0,
                mod.UIBgFill.None,
                mod.Message(mod.stringkeys.vipFiesta.ui.plainNumber, teamInfo.vipKills),
                16,
                mod.CreateVector(1, 1, 1),
                1,
                mod.UIAnchor.CenterRight
            );
        }

        // Set initial time label to current remaining at overlay moment
        const otw = mod.FindUIWidgetWithName(contentName + "_time") as mod.UIWidget;
        if (otw) {
            try { mod.SetUIWidgetDepth(otw, mod.UIDepth.AboveGameUI); } catch { }
        }
    }
}
