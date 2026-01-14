/**
 * Score UI implementation for VIP-Fiesta game mode
 * 
 * This module manages the real-time score display at the bottom left of the screen,
 * showing VIP kills per team with progress bars, team ranks, and highlighting the player's team.
 */

import { CONFIG } from './config.ts';
import { gameState } from './state.ts';

interface TeamScoreInfo {
    teamId: number;
    vipKills: number;
    rank: number;
}

// Store UI widgets for updating
const scoreUIWidgets: Map<string, mod.UIWidget> = new Map();

/**
 * Get team color based on team ID
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
    
    const index = (teamId - 1) % colors.length;
    return colors[index];
}

/**
 * Get rank suffix (1st, 2nd, 3rd, 4th, etc.)
 */
function getRankSuffix(rank: number): string {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return rank + 'th';
}

/**
 * Get sorted team scores
 */
function getSortedTeamScores(): TeamScoreInfo[] {
    const teamScores: TeamScoreInfo[] = [];
    
    // Collect all team scores
    for (const [teamId, vipKills] of gameState.vipKillsByTeamId.entries()) {
        teamScores.push({ teamId, vipKills, rank: 0 });
    }
    
    // Sort by VIP kills (descending)
    teamScores.sort((a, b) => b.vipKills - a.vipKills);
    
    // Assign ranks
    for (let i = 0; i < teamScores.length; i++) {
        teamScores[i].rank = i + 1;
    }
    
    return teamScores;
}

/**
 * Get the teams to display in the score UI for a specific player
 * - Shows top 3 teams
 * - Always includes the player's team if not in top 3
 */
function getTeamsToDisplay(player: mod.Player): TeamScoreInfo[] {
    const allScores = getSortedTeamScores();
    const playerTeamId = mod.GetObjId(mod.GetTeam(player));
    
    // Get top 3 teams
    const topTeams = allScores.slice(0, 3);
    
    // Check if player's team is in top 3
    const playerTeamInTop3 = topTeams.some(t => t.teamId === playerTeamId);
    
    if (playerTeamInTop3 || allScores.length <= 3) {
        return topTeams;
    }
    
    // Player's team is not in top 3, show top 2 and player's team
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
    const widgetPrefix = `scoreUI_${playerId}`;
    
    // Main container at bottom left
    const mainContainer = mod.AddUIContainer(
        `${widgetPrefix}_main`,
        mod.CreateVector(20, -20, 0),
        mod.CreateVector(400, 250, 0),
        mod.UIAnchor.BottomLeft,
        mod.GetUIRoot(),
        true,
        0,
        mod.CreateVector(0, 0, 0),
        0,
        mod.UIBgFill.None,
        player
    );
    
    scoreUIWidgets.set(`${widgetPrefix}_main`, mainContainer);
    
    // Target header: "TARGET: 10 VIP KILLS"
    const headerWidget = mod.AddUIText(
        `${widgetPrefix}_header`,
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(400, 30, 0),
        mod.UIAnchor.TopLeft,
        mainContainer,
        true,
        4,
        mod.CreateVector(0.1, 0.1, 0.1),
        0.7,
        mod.UIBgFill.Solid,
        mod.Message(mod.stringkeys.vipFiesta.ui.targetHeader, CONFIG.targetVipKills),
        18,
        mod.CreateVector(1, 1, 1),
        1,
        mod.UIAnchor.Center,
        player
    );
    
    scoreUIWidgets.set(`${widgetPrefix}_header`, headerWidget);
    
    // Update the score display
    updateScoreUIForPlayer(player);
}

/**
 * Update the score UI for a specific player
 */
function updateScoreUIForPlayer(player: mod.Player): void {
    const playerId = mod.GetObjId(player);
    const playerTeamId = mod.GetObjId(mod.GetTeam(player));
    const widgetPrefix = `scoreUI_${playerId}`;
    
    // Clean up existing team entries
    for (let i = 0; i < 3; i++) {
        const teamEntryKey = `${widgetPrefix}_team_${i}`;
        const existingWidget = scoreUIWidgets.get(teamEntryKey);
        if (existingWidget) {
            try {
                mod.DeleteUIWidget(existingWidget);
            } catch {
                // Widget might already be deleted
            }
            scoreUIWidgets.delete(teamEntryKey);
        }
    }
    
    const mainContainer = scoreUIWidgets.get(`${widgetPrefix}_main`);
    if (!mainContainer) return;
    
    const teamsToDisplay = getTeamsToDisplay(player);
    const yOffset = 40; // Start below the header
    const entryHeight = 60;
    const entrySpacing = 10;
    
    for (let i = 0; i < teamsToDisplay.length; i++) {
        const teamInfo = teamsToDisplay[i];
        const isPlayerTeam = teamInfo.teamId === playerTeamId;
        const yPos = yOffset + i * (entryHeight + entrySpacing);
        
        // Team entry container
        const teamContainer = mod.AddUIContainer(
            `${widgetPrefix}_team_${i}`,
            mod.CreateVector(0, yPos, 0),
            mod.CreateVector(400, entryHeight, 0),
            mod.UIAnchor.TopLeft,
            mainContainer,
            true,
            4,
            isPlayerTeam ? mod.CreateVector(0.3, 0.3, 0.3) : mod.CreateVector(0.15, 0.15, 0.15),
            isPlayerTeam ? 0.9 : 0.7,
            mod.UIBgFill.Solid,
            player
        );
        
        scoreUIWidgets.set(`${widgetPrefix}_team_${i}`, teamContainer);
        
        // Rank and team label (left side)
        const rankText = getRankSuffix(teamInfo.rank);
        const teamName = getTeamName(teamInfo.teamId);
        const labelText = isPlayerTeam ? `${rankText} ${teamName} (YOU)` : `${rankText} ${teamName}`;
        
        mod.AddUIText(
            `${widgetPrefix}_team_${i}_label`,
            mod.CreateVector(8, 0, 0),
            mod.CreateVector(150, entryHeight, 0),
            mod.UIAnchor.TopLeft,
            teamContainer,
            true,
            0,
            mod.CreateVector(0, 0, 0),
            0,
            mod.UIBgFill.None,
            mod.Message(labelText),
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
        
        const progressBg = mod.AddUIContainer(
            `${widgetPrefix}_team_${i}_progress_bg`,
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
        
        // Progress bar fill
        const progress = Math.min(teamInfo.vipKills / CONFIG.targetVipKills, 1.0);
        const fillWidth = Math.max(progressBarWidth * progress, 2);
        const teamColor = getTeamColor(teamInfo.teamId);
        
        mod.AddUIImage(
            `${widgetPrefix}_team_${i}_progress_fill`,
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
        
        // Score text (right side)
        mod.AddUIText(
            `${widgetPrefix}_team_${i}_score`,
            mod.CreateVector(-8, 0, 0),
            mod.CreateVector(50, entryHeight, 0),
            mod.UIAnchor.TopRight,
            teamContainer,
            true,
            0,
            mod.CreateVector(0, 0, 0),
            0,
            mod.UIBgFill.None,
            mod.Message(String(teamInfo.vipKills)),
            16,
            mod.CreateVector(1, 1, 1),
            1,
            mod.UIAnchor.CenterRight,
            player
        );
    }
}

/**
 * Get team name from team ID
 */
function getTeamName(teamId: number): string {
    // Map team IDs to string keys
    const teamKey = `team${teamId}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamStringKey = (mod.stringkeys.vipFiesta.teams as any)[teamKey];
    if (teamStringKey) {
        return mod.FormatMessage(mod.Message(teamStringKey));
    }
    return `Team ${teamId}`;
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
    const widgetPrefix = `scoreUI_${playerId}`;
    
    // Clean up all widgets for this player
    for (const [key, widget] of scoreUIWidgets.entries()) {
        if (key.startsWith(widgetPrefix)) {
            try {
                mod.DeleteUIWidget(widget);
            } catch {
                // Widget might already be deleted
            }
            scoreUIWidgets.delete(key);
        }
    }
}
