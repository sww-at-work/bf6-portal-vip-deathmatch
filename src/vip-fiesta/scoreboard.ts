/**
 * Scoreboard implementation for VIP-Fiesta game mode
 * 
 * This module handles:
 * - Setting up the scoreboard type (CustomFFA)
 * - Configuring column names and widths
 * - Calculating internal sorting numbers for each player
 * - Updating player scoreboard values
 * 
 * Sorting logic:
 * - Players are clustered by team
 * - Teams are sorted by VIP kills (descending)
 * - Within each team, players are sorted by:
 *   1. VIP kills (descending)
 *   2. Total kills (descending)
 *   3. Deaths (ascending)
 */

export interface ScoreboardData {
    teamVipById: Map<number, number>;
    vipKillsByTeamId: Map<number, number>;
    playerVipKillsById: Map<number, number>;
    playerKillsById: Map<number, number>;
    playerDeathsById: Map<number, number>;
}

/**
 * Initialize the scoreboard with column names and configuration
 */
export function initializeScoreboard(): void {
    // Set scoreboard type to CustomFFA as required
    mod.SetScoreboardType(mod.ScoreboardType.CustomFFA);

    // Configure column names
    // Columns: Team, VIP Status, VIP Kills, Kills, Deaths
    mod.SetScoreboardColumnNames(
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColTeam),
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColVipKills),
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColKills),
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColDeaths),
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColSortOrder) // Hidden column for sorting
    );

    // Set column widths (team, vipKills, kills, deaths, sortOrder)
    mod.SetScoreboardColumnWidths(10, 15, 15, 15, 1);

    // Sort by the 5th column (sortOrder) in ascending order
    mod.SetScoreboardSorting(5, false);
}

/**
 * Calculate the sorting number for a player
 * Lower numbers appear first in the scoreboard
 * 
 * Formula:
 * - Team rank multiplier (based on team VIP kills)
 * - Within team, sort by player VIP kills, then total kills, then deaths
 */
function calculateSortingNumber(
    playerId: number,
    teamId: number,
    teamRanks: Map<number, number>,
    data: ScoreboardData
): number {
    const teamRank = teamRanks.get(teamId) ?? 999;
    const playerVipKills = data.playerVipKillsById.get(playerId) ?? 0;
    const playerKills = data.playerKillsById.get(playerId) ?? 0;
    const playerDeaths = data.playerDeathsById.get(playerId) ?? 0;

    // Team rank * large multiplier to group teams together
    // Lower team rank (better) = lower number (appears first)
    const teamComponent = teamRank * 1000000;

    // Within team, negate VIP kills and total kills to sort descending
    // Keep deaths positive to sort ascending
    const vipKillsComponent = (999 - playerVipKills) * 10000;
    const killsComponent = (9999 - playerKills) * 100;
    const deathsComponent = playerDeaths;

    return teamComponent + vipKillsComponent + killsComponent + deathsComponent;
}

/**
 * Calculate team ranks based on VIP kills
 * Teams with more VIP kills get lower rank numbers (rank 1 is best)
 */
function calculateTeamRanks(vipKillsByTeamId: Map<number, number>): Map<number, number> {
    const teamRanks = new Map<number, number>();

    // Sort teams by VIP kills descending
    const sortedTeams = Array.from(vipKillsByTeamId.entries()).sort((a, b) => {
        const killsA = a[1];
        const killsB = b[1];
        if (killsB !== killsA) return killsB - killsA; // More kills = better rank
        return a[0] - b[0]; // Tiebreaker: lower team ID
    });

    // Assign ranks
    sortedTeams.forEach(([teamId], index) => {
        teamRanks.set(teamId, index + 1); // Rank 1, 2, 3, etc.
    });

    return teamRanks;
}

/**
 * Update scoreboard values for all players
 */
export function updateScoreboard(data: ScoreboardData): void {
    const teamRanks = calculateTeamRanks(data.vipKillsByTeamId);

    const allPlayers = mod.AllPlayers();
    const playerCount = mod.CountOf(allPlayers);

    for (let i = 0; i < playerCount; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        const playerId = mod.GetObjId(player);
        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);

        const playerVipKills = data.playerVipKillsById.get(playerId) ?? 0;
        const playerKills = data.playerKillsById.get(playerId) ?? 0;
        const playerDeaths = data.playerDeathsById.get(playerId) ?? 0;
        const sortingNumber = calculateSortingNumber(playerId, teamId, teamRanks, data);

        // Set scoreboard values for this player
        // Columns: Team ID, VIP Kills, Kills, Deaths, Sorting Number
        mod.SetScoreboardPlayerValues(
            player,
            teamId, // Column 1: Team ID
            playerVipKills, // Column 2: VIP Kills
            playerKills, // Column 3: Total Kills
            playerDeaths, // Column 4: Deaths
            sortingNumber // Column 5: Hidden sorting number
        );
    }
}
